# Highlight Bear 🐻

A Chrome extension that allows you to highlight text on any web pages using customizable rules.

![Highlight Bear](docs/poster.jpeg)

<a href="https://buymeacoffee.com/riiiiiiiiiina" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Features

- **URL Pattern Matching**: Create highlighting rules that apply to specific websites using URL patterns
- **Custom Highlighting**: Define custom keywords and phrases to highlight with your choice of colors
- **Custom Highlight Colors**: Choose any color you want for each keyword
- **Rule Management**: Easily create, edit, enable/disable, and delete highlighting rules
- **Automatic Detection**: Highlights are applied automatically when you visit matching pages
- **Dynamic Content Support**: Works with single-page applications and dynamically loaded content
- **Import/Export**: Backup and share your highlighting rules

## Installation

### From Chrome Web Store

(Coming soon)

### Manual Installation

1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked"
6. Select the `highlighter-bear` directory

## Usage

1. Click the Highlighter Bear icon in your Chrome toolbar to open the options page
2. Click "Add New Rule" to create a highlighting rule
3. Configure your rule:
   - **Rule Name**: Give your rule a descriptive name
   - **URL Pattern**: Define which pages the rule applies to (e.g., `github.com`)
   - **Keywords**: Add words or phrases to highlight
   - **Colors**: Choose a color for each keyword
4. Enable the rule and visit a matching website to see your highlights in action

### URL Pattern Examples

URL patterns use simple string matching. The page URL must contain the pattern you specify.

- `github.com` - Matches any page with "github.com" in the URL
- `example.com/docs` - Matches pages containing "example.com/docs"
- `google.com` - Matches any page with "google.com" in the URL
- Leave empty - Matches all websites

## Development

This project follows a zero-build philosophy using vanilla JavaScript.

### Setup

```bash
npm install
```

### Project Structure

```
/src
  /content      - Content scripts that run on web pages
  /options      - Options page UI and logic
  /libs         - Third-party libraries (CDN versions)
```

### Code Style

- Uses vanilla JavaScript (no TypeScript)
- No build steps; plain source files only
- Single quotes for all string literals
- TailwindCSS for styling
- DaisyUI for UI components

For more details, see [AGENTS.md](AGENTS.md).

## Technical Details

- **Manifest Version**: 3
- **Permissions**: Storage (for saving rules)
- **Frameworks**: TailwindCSS, DaisyUI
- **Content Script**: Runs on all URLs with pattern matching

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

If you find this extension helpful, consider supporting the development:

## Author

Rina - riiiiiiiiiina0@gmail.com
