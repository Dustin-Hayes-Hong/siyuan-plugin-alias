# SiYuan Alias Processor (思源别名处理器)

[中文版](./README.md)

A professional batch alias synchronization tool for SiYuan Note. It utilizes low-level physical path traversal to precisely and safely identify and synchronize alias properties for folders and their nested documents.

## Engineering Logic

### 1. Recursive Deep Sync
Unlike traditional shallow scanning, this plugin utilizes **Recursive Deep Traversal**:
- **Full Hierarchy Discovery**: Leverages SiYuan's File Tree API to automatically reach sub-folders at any depth.
- **Physical Path Anchoring**: Relies on internal physical `path` (ID-based) instead of the volatile `hpath`, ensuring 100% identification precision.

### 2. Read-Only Safe Parsing
To protect user data at all costs, the plugin follows a **Non-Destructive Content** principle:
- **No Text Modification**: Scanning is done in a "read-only" manner. All `updateBlock` operations on document content are **permanently disabled**.
- **Lossless Attribute Merging**: Newly discovered aliases are intelligently merged with existing ones, ensuring manually set aliases are never overwritten or lost.

### 3. Database Gap Handling (Index Bypass)
Addresses potential database indexing gaps in large notebooks (e.g., missing journal records):
- **File Tree Fallback**: When the SQL index is incomplete, the plugin automatically falls back to File System APIs to discover missing documents, matching the physical file count 100%.

### 4. Supported Alias Sources
- **YAML Frontmatter**: Supports `alias: [a, b]` or multi-line block list formats.
- **Inline Attributes**: Supports `alias:: value` format.
- **Auto-Cleanup**: Automatically strips formatting markers like bullet points (`-`) from YAML lists.

## How to Use

1. Click the **Sync Icon** in the top bar or use the hotkey.
2. The plugin automatically identifies your current folder and calculates the total count of sub-documents (including the current one).
3. Verify the document count in the **Safety Confirmation** dialog.
4. Click OK, and the plugin will synchronize and merge all aliases in the background.

## Safety Features
- **Root Sync Protection**: Prevents running at the notebook root to avoid accidental massive changes.
- **Progress Tracking**: Real-time display of the current processing path and overall progress.

## Support
Supports both **English** and **Chinese**.
