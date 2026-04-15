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
            // Register Commands
            this.addCommand({
                langKey: "processBatch",
                langText: this.i18n.processBatch,
                hotkey: "\u2325\u2318P",
                callback: () => this.processCurrentDocument()
            });
            this.addCommand({
                langKey: "processWhole",
                langText: this.i18n.processWhole,
                callback: () => this.processWholeNotebook()
            });

            // Add TopBar dropdown
            this.addTopBar({
                icon: "iconLink",
                title: this.i18n.processBatch,
                position: "right",
                callback: (event) => {
                    const menu = new c.Menu("processorMenu");
                    menu.addItem({
                        icon: "iconFiles",
                        label: this.i18n.processBatch,
                        click: () => this.processCurrentDocument()
                    });
                    menu.addItem({
                        icon: "iconFolders",
                        label: this.i18n.processWhole,
                        click: () => this.processWholeNotebook()
                    });
                    menu.openAtMouseEvent(event);
                }
            })
        }

        processCurrentDocument() {
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
                        stmt: `SELECT parent_id, box FROM blocks WHERE id = '${currentId}'` 
                    });
                    if (!infoRes || !infoRes.data || infoRes.data.length === 0) {
                        (0, c.showMessage)(this.i18n.docNotFound);
                        return;
                    }
                    
                    const { parent_id, box } = infoRes.data[0];
                    const query = `SELECT id, content FROM blocks WHERE parent_id = '${parent_id || ""}' AND type = 'd' AND box = '${box}'`;
                    const siblingsRes = yield this.request("/api/query/sql", { stmt: query });
                    let docs = siblingsRes.data || [];
                    
                    if (docs.findIndex(d => d.id === currentId) === -1) docs.push({ id: currentId, content: "Current" });

                    (0, c.showMessage)(this.i18n.startBatch.replace("${docs}", docs.length), 3e3);
                    yield this.batchProcessDocs(docs);

                } catch (e) {
                    (0, c.showMessage)(this.i18n.criticalError.replace("${msg}", e.message), 10000);
                }
            });
        }

        processWholeNotebook() {
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

                const box = activeProtyle.block.box;
                try {
                    const query = `SELECT id, content FROM blocks WHERE box = '${box}' AND type = 'd'`;
                    const res = yield this.request("/api/query/sql", { stmt: query });
                    const docs = res.data || [];

                    if (docs.length === 0) {
                        (0, c.showMessage)(this.i18n.noDocs);
                        return;
                    }

                    // Confirmation
                    if (!window.confirm(this.i18n.confirmBatch.replace("${docs}", docs.length))) {
                        return;
                    }

                    (0, c.showMessage)(this.i18n.startBatchFull.replace("${docs}", docs.length), 3000);
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
                const rootAttrsRes = yield this.request("/api/attr/getBlockAttrs", { id: rootId });
                if (rootAttrsRes && rootAttrsRes.code === 0) {
                    const attrs = rootAttrsRes.data;
                    const attrKeys = ['custom-aliases', 'aliases', 'alias'];
                    for (const key of attrKeys) {
                        if (attrs[key]) {
                            let val = attrs[key].toString().trim();
                            val = val.replace(/^\[(.*)\]$/, '$1').replace(/^['"](.*)['"]$/, '$1');
                            if (val) allAliases.push(...val.split(/[,，]/).map(v => v.trim()).filter(v => v));
                        }
                    }
                }

                const blocksRes = yield this.request("/api/block/getChildBlocks", { id: rootId });
                if (!blocksRes || blocksRes.code !== 0) return;
                const blocks = blocksRes.data || [];
                
                for (let block of blocks.slice(0, 10)) {
                    const kRes = yield this.request("/api/block/getBlockKramdown", { id: block.id });
                    if (kRes && kRes.code === 0) {
                        const kramdown = kRes.data.kramdown;
                        if (kramdown.toLowerCase().includes("alias") || block.type === "c") {
                            const found = yield this.parseYaml(rootId, block, kramdown);
                            if (found) allAliases.push(...found);
                        } else if (kramdown.trim() === "---" || kramdown.trim() === "```yaml\n```") {
                             yield this.request("/api/block/updateBlock", { id: block.id, data: "", dataType: "markdown" });
                        }
                    }
                }

                const unique = [...new Set(allAliases.map(a => a.trim()))].filter(a => a);
                if (unique.length > 0) yield this.request("/api/attr/setBlockAttrs", { id: rootId, attrs: { alias: unique.join(",") } });

                let firstPara = blocks.find(l => l.type === "p");
                if (firstPara) yield this.parseAttributes(rootId, firstPara);
                yield this.processLinks(blocks);
            });
        }

        parseYaml(rootId, block, kramdown) {
            return f(this, null, function* () {
                const lines = kramdown.split(/\r?\n/);
                let list = [], keep = [], i = 0;
                while (i < lines.length) {
                    let line = lines[i];
                    let match = line.match(/\b(?:aliases|alias):\s*(.*)$/i);
                    if (match) {
                        let val = match[1].trim();
                        if (val === "" || val === ">" || val === "|") {
                            i++;
                            while (i < lines.length) {
                                let m = lines[i].match(/^\s*-\s+(.+)$/);
                                if (m) { list.push(m[1].trim()); i++; }
                                else if (lines[i].trim() === "" || lines[i].trim() === "---") i++;
                                else if (/\b[\w-]+:/.test(lines[i])) break;
                                else i++;
                            }
                            continue;
                        } else {
                            val = val.replace(/^\[(.*)\]$/, '$1').replace(/^['"](.*)['"]$/, '$1');
                            if (val.includes(",") || val.includes("，")) list.push(...val.split(/[,，]/));
                            else list.push(val);
                            i++; continue;
                        }
                    }
                    keep.push(line); i++;
                }
                if (list.length > 0) {
                    let data = keep.join("\n").trim();
                    if (data === "---\n---" || data === "---" || data === "```yaml\n```" || data === "```\n```") data = "";
                    yield this.request("/api/block/updateBlock", { id: block.id, data: data, dataType: "markdown" });
                }
                return list.map(v => v.trim().replace(/^['"](.*)['"]$/, '$1')).filter(v => v);
            });
        }

        parseAttributes(rootId, targetBlock) {
            return f(this, null, function* () {
                const r = yield this.request("/api/block/getBlockKramdown", { id: targetBlock.id });
                if (!r || r.code !== 0) return 0;
                const e = r.data.kramdown, lines = e.split(`\n`);
                let count = 0, aliasVal = "", newLines = [];
                const regex = /([\w\u4e00-\u9fa5]+)::\s*(.+)/g;
                for (const line of lines) {
                    let processed = line.replace(regex, (m, k, v) => {
                        count++;
                        if (k.toLowerCase() === "alias") { aliasVal = v; return ""; }
                        return `[[${k}]] [[${v}]]`;
                    });
                    newLines.push(processed);
                }
                if (aliasVal) yield this.request("/api/attr/setBlockAttrs", { id: rootId, attrs: { alias: aliasVal } });
                const finalData = newLines.filter(g => g.trim() !== "").join(`\n`);
                if (finalData !== e) yield this.request("/api/block/updateBlock", { id: targetBlock.id, data: finalData, dataType: "markdown" });
                return count;
            })
        }

        processLinks(blocks) {
            return f(this, null, function* () {
                let count = 0;
                for (const block of blocks) {
                    if (block.type !== "p" && block.type !== "h" && block.type !== "i") continue;
                    const res = yield this.request("/api/block/getBlockKramdown", { id: block.id });
                    if (!res || res.code !== 0) continue;
                    let kramdown = res.data.kramdown;
                    const linkRegex = /\[\[(.*?)\]\]/g;
                    let match, replacements = [];
                    for (; (match = linkRegex.exec(kramdown)) !== null;) {
                        const content = match[1];
                        const query = yield this.request("/api/query/sql", { stmt: `SELECT id FROM blocks WHERE type='d' AND content='${content.replace(/'/g, "''")}' LIMIT 1` });
                        if (query && query.data && query.data.length > 0) {
                            replacements.push({ original: match[0], replacement: `((${query.data[0].id} '${content}'))` });
                            count++;
                        }
                    }
                    if (replacements.length > 0) {
                        let updated = kramdown;
                        for (const rep of replacements) updated = updated.replace(rep.original, rep.replacement);
                        yield this.request("/api/block/updateBlock", { id: block.id, data: updated, dataType: "markdown" });
                    }
                }
                return count;
            })
        }
        onunload() {}
    }
    module.exports = h
})();
