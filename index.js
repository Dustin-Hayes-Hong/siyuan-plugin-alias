/*!
 * MIT License
 *
 * Copyright (c) 2023 SiYuan 思源笔记
 */
(() => {
    "use strict";
    var p = {};
    p.d = (d, o) => {
        for (var t in o) p.o(o, t) && !p.o(d, t) && Object.defineProperty(d, t, { enumerable: !0, get: o[t] })
    };
    p.o = (d, o) => Object.prototype.hasOwnProperty.call(d, o);
    p.r = d => {
        typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(d, Symbol.toStringTag, { value: "Module" });
        Object.defineProperty(d, "__esModule", { value: !0 })
    };
    var h = {};
    p.r(h);
    p.d(h, { default: () => w });
    const c = require("siyuan");
    var f = (d, o, t) => new Promise((r, e) => {
        var i = n => { try { s(t.next(n)) } catch (l) { e(l) } },
            u = n => { try { s(t.throw(n)) } catch (l) { e(l) } },
            s = n => n.done ? r(n.value) : Promise.resolve(n.value).then(i, u);
        s((t = t.apply(d, o)).next())
    });

    class w extends c.Plugin {
        request(o, t) {
            return f(this, null, function* () {
                return new Promise((resolve) => {
                    (0, c.fetchPost)(o, t, response => resolve(response || { code: -1, msg: "No response" }));
                });
            });
        }
        onload() {
            // Register Command
            this.addCommand({
                langKey: "syncFolder",
                langText: this.i18n.syncFolder,
                hotkey: "\u2325\u2318P",
                callback: () => this.processCurrentFolder()
            });

            // Add TopBar button
            this.addTopBar({
                icon: "iconLink",
                title: this.i18n.syncFolder,
                position: "right",
                callback: () => this.processCurrentFolder()
            });
        }

        processCurrentFolder() {
            return f(this, null, function* () {
                const editors = (0, c.getAllEditor)();
                let activeProtyle = null;
                if (editors && editors.length > 0) {
                    for (const e of editors) if (e.protyle && e.protyle.active) { activeProtyle = e.protyle; break; }
                    activeProtyle || (activeProtyle = editors[0].protyle);
                }
                if (!activeProtyle) {
                    (0, c.showMessage)(this.i18n.openDocFirst);
                    return;
                }

                const currentId = activeProtyle.block.rootID;
                try {
                    const infoRes = yield this.request("/api/query/sql", { 
                        stmt: `SELECT id, path, hpath, box FROM blocks WHERE id = '${currentId}'` 
                    });
                    if (!infoRes || !infoRes.data || infoRes.data.length === 0) {
                        (0, c.showMessage)(this.i18n.docNotFound);
                        return;
                    }
                    
                    let { id, path, hpath, box } = infoRes.data[0];
                    console.log("EXECUTION START ----------------");
                    console.log("Current Doc ID:", id);
                    console.log("Current Path:", path);
                    console.log("Current Hpath:", hpath);
                    console.log("Current Box:", box);

                    // Safety Check: Root path
                    if (hpath === "/" || path === "/" || !path) {
                        console.log("STOP: Root path detected.");
                        (0, c.showMessage)(this.i18n.cannotSyncRoot);
                        return;
                    }

                    // Normalize folder prefix: remove .sy and ensure it ends with /
                    const folderPrefix = path.endsWith(".sy") ? path.slice(0, -3) : path;
                    console.log("Determined Folder Prefix:", folderPrefix);

                    // Check notebook-wide total document count for troubleshooting
                    const totalRes = yield this.request("/api/query/sql", {
                        stmt: `SELECT count(*) as total FROM blocks WHERE box = '${box}' AND type = 'd'`
                    });
                    console.log("Notebook Total Documents in Database:", totalRes.data ? totalRes.data[0].total : "unknown");

                    // Fallback to File Tree API to find documents that are NOT in the database index
                    // This is essential for large notebooks with non-indexed journals
                    console.log("Using File Tree API to list documents in folder:", folderPrefix);
                    const treeRes = yield this.request("/api/filetree/listDocsByPath", {
                        notebook: box,
                        path: folderPrefix
                    });
                    
                    let docs = [];
                    // Always include the current document itself
                    docs.push({ id, content: hpath, path });

                    if (treeRes.data && treeRes.data.files) {
                        // SiYuan's listDocsByPath returns an array of file objects
                        for (const f of treeRes.data.files) {
                            // Only include documents (.sy files)
                            if (f.name.endsWith(".sy")) {
                                docs.push({
                                    id: f.id,
                                    content: f.name.replace(".sy", ""), // Use filename as fallback content
                                    path: f.path
                                });
                            }
                        }
                    }
                    
                    console.log(`MATCHED ${docs.length} documents (including self) via File Tree API.`);
                    if (docs.length < 100) {
                        console.log("Matched Paths:", docs.map(d => d.path));
                    }
                    console.log("EXECUTION END ------------------");

                    if (docs.length === 0) {
                        (0, c.showMessage)(this.i18n.noDocs);
                        return;
                    }

                    if (!window.confirm(this.i18n.confirmSync.replace("${docs}", docs.length))) {
                        return;
                    }

                    (0, c.showMessage)(this.i18n.startSync.replace("${docs}", docs.length), 3e3);
                    yield this.batchProcessDocs(docs);

                } catch (e) {
                    (0, c.showMessage)(this.i18n.criticalError.replace("${msg}", e.message), 10000);
                }
            });
        }

        batchProcessDocs(docs) {
            return f(this, null, function* () {
                let successCount = 0;
                for (let i = 0; i < docs.length; i++) {
                    const doc = docs[i];
                    // Update progress message frequently
                    if (i % 5 === 0 || i === docs.length - 1) {
                        (0, c.showMessage)(this.i18n.progress.replace("${current}", i + 1).replace("${total}", docs.length).replace("${name}", doc.content), 1000);
                    }
                    try {
                        yield this.processDocById(doc.id);
                        successCount++;
                    } catch (e) {
                        console.error(`Failed ${doc.content}:`, e);
                    }
                }
                (0, c.showMessage)(this.i18n.finished.replace("${success}", successCount).replace("${total}", docs.length), 5000);
            });
        }

        processDocById(rootId) {
            return f(this, null, function* () {
                let allAliases = [];
                
                // 1. Fetch existing aliases from attributes to prevent overwriting
                const rootAttrsRes = yield this.request("/api/attr/getBlockAttrs", { id: rootId });
                if (rootAttrsRes && rootAttrsRes.code === 0) {
                    const attrs = rootAttrsRes.data;
                    const existing = attrs.alias || "";
                    if (existing) {
                        allAliases.push(...existing.split(/[,，]/).map(v => v.trim()).filter(v => v));
                    }
                }

                // 2. Scan first 10 blocks for NEW alias definitions (Read-Only)
                const blocksRes = yield this.request("/api/block/getChildBlocks", { id: rootId });
                if (blocksRes && blocksRes.code === 0) {
                    const blocks = blocksRes.data || [];
                    for (let block of blocks.slice(0, 10)) {
                        const kRes = yield this.request("/api/block/getBlockKramdown", { id: block.id });
                        if (kRes && kRes.code === 0) {
                            const kramdown = kRes.data.kramdown;
                            const lines = kramdown.split(/\r?\n/);
                            
                            for (let i = 0; i < lines.length; i++) {
                                const line = lines[i].trim();
                                // Match alias: val or aliases: val or alias:: val
                                const m = line.match(/^(?:aliases|alias)::?\s*(.*)$/i);
                                if (m) {
                                    let val = m[1].trim();
                                    // Handle YAML list starting on next lines
                                    if (val === "" || val === "-" || val === ">" || val === "|") {
                                        let j = i + 1;
                                        while (j < lines.length) {
                                            const subLine = lines[j].trim();
                                            const listMatch = subLine.match(/^-\s+(.+)$/);
                                            if (listMatch) {
                                                allAliases.push(listMatch[1].trim());
                                                j++;
                                            } else if (subLine === "") {
                                                j++; // skip empty lines in list
                                            } else {
                                                break; // end of list
                                            }
                                        }
                                        i = j - 1;
                                    } else {
                                        // Handle inline or comma-separated list [a, b]
                                        val = val.replace(/^\[(.*)\]$/, '$1').replace(/^['"](.*)['"]$/, '$1');
                                        allAliases.push(...val.split(/[,，]/).map(v => v.trim()).filter(v => v));
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. Merge and Filter Unique Aliases
                const unique = [...new Set(allAliases.map(a => a.trim()))].filter(a => a);
                
                // 4. Update Attributes ONLY (No updateBlock)
                if (unique.length > 0) {
                    yield this.request("/api/attr/setBlockAttrs", { 
                        id: rootId, 
                        attrs: { alias: unique.join(",") } 
                    });
                }
            });
        }

        onunload() {}
    }
    module.exports = h
})();
