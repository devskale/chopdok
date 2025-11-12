// lib/folderUtils.ts

export interface FolderItem {
  fullName: string;
  projectId: string;
  projectName: string;
  type: string;
  firstSeen: string | null;
}

export interface FolderContent {
  name: string;
  isDirectory: boolean;
  firstSeen: string | null;
  hasSummary: boolean;
  hasProposedName: boolean;
}

export function encodePath(pathSegments: string[]): string {
  return pathSegments.map(encodeURIComponent).join('/');
}

export function decodePath(encodedPath: string): string[] {
  return encodedPath.split('/').map(decodeURIComponent);
}

const ROOT_FOLDER = process.env.ROOT_FOLDER || './folders';


export async function scanRootFolder(): Promise<FolderItem[]> {
  try {
    console.log('Scanning root folder:', ROOT_FOLDER); // Log the root folder being scanned
    const items = await fs.readdir(ROOT_FOLDER, { withFileTypes: true });
    console.log('Items found:', items.length); // Log the number of items found
    const folders = items
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        encodedName: encodeURIComponent(item.name),
        isDirectory: true
      }));
    console.log('Folders found:', folders.length); // Log the number of folders found
    return folders;
  } catch (error) {
    console.error('Error scanning root folder:', error);
    throw new Error(`Failed to scan root folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}