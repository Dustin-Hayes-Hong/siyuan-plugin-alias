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

### 3. Full Notebook Synchronization
Scan and process every single document within a notebook. This feature includes a **Safety Confirmation** step to prevent unintended bulk changes.

### 3. Bilateral Link Conversion
Convert legacy `[[Note Title]]` links into native SiYuan `((ID 'Note Title'))` links automatically.

### 4. Smart Metadata Cleanup
Automatically removes empty YAML delimiters (`---`) and redundant markers left behind after synchronization.

## How to Use

1. Click the **Link Icon** in the top bar to open the processing menu.
2. Select **Alias Recognition in Folder** to handle files in the current folder.
3. Select **Process All Documents in Notebook** for a full-scale synchronization (requires confirmation).
4. Observe the progress notification at the top of the window.

## Support
Supports both **English** and **Chinese** (automatically switches based on SiYuan's language settings).
