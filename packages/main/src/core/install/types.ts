export interface ManifestVersion {
  id: string;
  type: 'release' | 'snapshot';
  url: string;
  time: string;
  releaseTime: string;
}

export interface Manifest {
  latest: { release: string; snapshot: string };
  versions: ManifestVersion[];
}

export type MojangOS = 'osx' | 'macos' | 'windows' | 'linux';

export interface Rule {
  action: 'allow' | 'disallow';
  features?: { [feature: string]: boolean };
  os?: { name?: MojangOS; version?: string; arch?: string };
}

interface OptionalArgument {
  rules: Rule[];
  value: string | string[];
}

interface LibraryDownload {
  path: string;
  sha1: string;
  size: number;
  url: string;
}

export interface MojangLibrary {
  downloads: {
    artifact: LibraryDownload;
    // classifiers: { [yada: string]: LibraryDownload };
  };
  name: string;
  rules?: Rule[];
  // natives?: { [a: string]: string };
}
export interface MavenLibrary {
  name: string;
  /** The **root URL** of the Maven repository */
  url: string;
}
type Library = MojangLibrary | MavenLibrary;

export interface Version {
  arguments: {
    game: (string | OptionalArgument)[];
    jvm: (string | OptionalArgument)[];
  };

  assetIndex: {
    id: string;
    sha1: string;
    size: number;
    totalSize: number;
    url: string;
  };

  assets: string;
  complianceLevel: number;

  downloads: {
    client: {
      sha1: string;
      size: number;
      url: string;
    };
    client_mappings: {
      sha1: string;
      size: number;
      url: string;
    };
    server: {
      sha1: string;
      size: number;
      url: string;
    };
    server_mappings: {
      sha1: string;
      size: number;
      url: string;
    };
  };

  id: string;
  javaVersion: { component: string; majorVersion: number };

  libraries: Library[];

  logging: {
    client: {
      /** The argument to add to the JVM. Replace `${path}` with the path two the downloaded XML file */
      argument: string;

      file: {
        id: string;
        sha1: string;
        size: number;
        url: string;
      };

      type: 'log4j2-xml';
    };
  };

  mainClass: string;
  minimumLauncherVersion: number;
  releaseTime: string;
  time: string;
  type: 'release' | 'snapshot';
}

export interface FabricLoaderManifest {
  loader: {
    separator: string;
    build: number;
    maven: string;
    version: string;
    stable: boolean;
  };
  intermediary: {
    maven: string;
    version: string;
    stable: boolean;
  };
  launcherMeta: {
    version: number;
    libraries: {
      client: MavenLibrary[];
      common: MavenLibrary[];
      server: MavenLibrary[];
    };
    mainClass:
      | {
          client: string;
          server: string;
        }
      | string;
  };
}
