# Alias Recognition Plugin (alias识别)

A powerful batch processing tool for SiYuan Note to streamline your workflow by automating metadata synchronization and link conversion.

## Features

### 1. Batch Alias Synchronization
Automatically extracts aliases from multiple sources and syncs them to the official document **Alias** property:
- **YAML Frontmatter**: Syncs `aliases` or `custom-aliases` defined at the top of the file.
- **YAML Code Blocks**: Detects and cleans up manual YAML code blocks.
- **Inline Properties**: Supports `alias:: value` format in paragraphs.

### 2. Sibling Batch Processing
Process all documents in the same folder with a single click. Ideal for bulk-imported notes or journals.

### 3. Bilateral Link Conversion
Convert legacy `[[Note Title]]` links into native SiYuan `((ID 'Note Title'))` links automatically.

### 4. Smart Metadata Cleanup
Automatically removes empty YAML delimiters (`---`) and redundant markers left behind after synchronization.

## How to Use

1. Click the **Link Icon** in the top bar.
2. The plugin will identify all sibling documents in the current folder.
3. Observe the progress notification at the top of the window.
4. Once finished, document properties will be updated across all files.

## Support
Supports both **English** and **Chinese** (automatically switches based on SiYuan's language settings).
