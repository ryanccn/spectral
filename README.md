<h1 align="center">
  <p><img src="https://raw.githubusercontent.com/ryanccn/spectral/main/buildResources/icon.png" width="100" height="100" /></p>
  <p>Spectral</p>
</h1>

A elegant and powerful Minecraft launcher for macOS.

It's made with [Electron](https://electronjs.org).

Try it out!

## Installation

Download from the **[releases page](https://github.com/ryanccn/spectral/releases)**.

Do note that the macOS app isn't code-signed, so it'll be quarantined by macOS. Use the following command to take the app out of quarantine:

```bash
$ xattr -d com.apple.quarantine /Applications/Spectral.app
```

## Roadmap

- [ ] CI workflow for building & releasing
- [ ] Code signing (Apple's swindle)
- [ ] Windows & Linux support (b/c why not, we're already on Electron)
