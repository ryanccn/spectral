interface Window {
    readonly electronAPI: { versions: NodeJS.ProcessVersions; platform: NodeJS.Platform; test: () => void; };
}
