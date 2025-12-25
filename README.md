# Hide Specified Files for Obsidian

[简体中文](README_CN.md) | **English**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/cyenx/obsidian-hide-specified-files)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.4.11+-purple.svg)](https://obsidian.md/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An Obsidian plugin that allows you to hide specified files and folders in the File Explorer with a quick toggle button.

## ✨ Features

- 🎯 **Exact Name Matching**: Hide files and folders by exact name (including file extension)
- 👁️ **Quick Toggle**: Ribbon icon button for instant hide/show switching
  - 🙈 Eye-off icon: Files are hidden (enabled)
  - 👁️ Eye icon: All files are visible (disabled)
- 🖱️ **Context Menu**: Right-click any file in File Explorer to quickly hide it
- ⚙️ **Settings UI**: Manage your hidden items list with an intuitive interface
- ⌨️ **Command Palette**: Toggle hiding via keyboard shortcuts
- 💾 **Persistent**: Your hidden files list is saved and restored automatically

## 📦 Installation

### Manual Installation

1. Download the latest release from the [Releases](https://github.com/cyenx/obsidian-hide-specified-files/releases) page
2. Extract `main.js` and `manifest.json` into your vault's plugin folder:
   ```
   <vault>/.obsidian/plugins/hide-specified-files/
   ```
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### From Source

```bash
# Clone the repository
git clone https://github.com/cyenx/obsidian-hide-specified-files.git
cd obsidian-hide-specified-files

# Install dependencies
npm install

# Build the plugin
npm run build

# Copy to your vault
cp main.js manifest.json <vault>/.obsidian/plugins/hide-specified-files/
```

## 🚀 Usage

### 1. Ribbon Icon (Quick Toggle)

Click the eye icon in the left sidebar to quickly toggle file hiding on/off:

- **Eye-off icon** 🙈: Hiding is enabled (files are hidden)
- **Eye icon** 👁️: Hiding is disabled (all files visible)

The icon automatically updates to reflect the current state.

### 2. Settings Interface

**Settings → Hide Specified Files**

- **Enable file hiding**: Master toggle switch
- **Add files to hide**: Enter the exact file or folder name
  - For files: Include the extension (e.g., `README.md`, `notes.txt`)
  - For folders: Just the folder name (e.g., `drafts`, `.obsidian`)
- **Manage hidden list**: View and remove hidden items

### 3. Context Menu

Right-click any file or folder in the File Explorer:

- Select **"Hide this file"** to add it to the hidden list
- Already hidden items show **"Already hidden"** (disabled)

### 4. Command Palette

Press `Cmd/Ctrl + P` and type:

- **"Toggle file hiding on/off"**: Switch hiding on/off
- **"Refresh File Explorer"**: Manually refresh the file tree

## ⚙️ Configuration

The plugin stores configuration in:
```
<vault>/.obsidian/plugins/hide-specified-files/data.json
```

Configuration structure:
```json
{
  "enabled": true,
  "hiddenNames": [
    "README.md",
    "drafts",
    ".obsidian"
  ]
}
```

## 🔧 Development

### Requirements

- Node.js 20+
- npm or yarn
- Obsidian 1.4.11+

### Build from Source

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck
```

### Tech Stack

- **Language**: TypeScript (strict mode)
- **Build Tool**: esbuild
- **Obsidian API**: Official API (1.5.3+)
- **Dependencies**:
  - `monkey-around`: Safe monkey patching for Obsidian internals

### Architecture

- **File Matching**: Exact name matching (case-sensitive)
  - Files: Match by `name` (with extension)
  - Folders: Match by `name`
- **Patching**: Uses `monkey-around` to patch File Explorer methods
  - `getSortedFolderItems()`: Filter folder contents
  - `onFileOpen()`: Prevent auto-reveal of hidden files
  - `revealInFolder()`: Block "Reveal in folder" for hidden items
- **Performance**: O(1) lookup using Set data structure with caching

## 🎯 How It Works

The plugin uses a non-intrusive approach:

1. **Data Layer Filtering**: Patches File Explorer's `getSortedFolderItems()` method
2. **No File System Changes**: Files remain on disk, only hidden in the UI
3. **Scope**: Only affects File Explorer view (search, Quick Switcher unaffected)
4. **Clean Unload**: All patches are properly removed when plugin is disabled

## ⚠️ Important Notes

- **Exact Matching**: Files with the same name in different folders will all be hidden
- **File Explorer Only**: Hidden files may still appear in search results and Quick Switcher
- **Root Folder**: Cannot hide the vault root folder (safety feature)
- **Open Files**: Hiding a currently open file won't close it in the editor

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the [Show Hidden Files](https://github.com/pjeby/show-hidden-files) plugin
- Built with the [Obsidian Plugin Developer Guide](https://marcus.se.net/obsidian-plugin-docs/)

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/cyenx/obsidian-hide-specified-files/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cyenx/obsidian-hide-specified-files/discussions)

---

**Made with ❤️ for the Obsidian community**
