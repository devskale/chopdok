// lib/serverUtils.ts
import fs from 'fs/promises';
import path from 'path';
import { FolderContent as ImportedFolderContent } from './folderUtils';
import { getFirstSeen, getSummary, recordDirectory, getProposedName } from './db';

const ROOT_FOLDER = process.env.ROOT_FOLDER || './folder';


export async function listFolder(folderPath: string): Promise<LocalFolderContent[]> {
  try {
    const fullPath = path.join(ROOT_FOLDER, folderPath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    
    const contents = await Promise.all(items.map(async (item) => {
      const itemPath = path.join(fullPath, item.name);
      const firstSeen = item.isDirectory() ? await getFirstSeen(itemPath) : null;
      const hasSummary = !item.isDirectory() && await getSummary(itemPath) !== null;
      const hasProposedName = !item.isDirectory() && await getProposedName(itemPath) !== null;
      
      return {
        name: item.name,
        isDirectory: item.isDirectory(),
        firstSeen,
        hasSummary,
        hasProposedName
      };
    }));

    return contents;
  } catch (error) {
    console.error(`Error listing folder ${folderPath}:`, error);
    throw new Error(`Failed to list folder contents: ${error instanceof Error ? error.message : String(error)}`);
  }
}




export interface FolderItem {
    fullName: string;
    projectId: string;
    projectName: string;
    type: string;
    firstSeen: string | null;
  }
  
  export interface LocalFolderContent {
      name: string;
      isDirectory: boolean;
      firstSeen: string | null;
    }
  
  export async function scanRootFolder(): Promise<FolderItem[]> {
    try {
      console.log('Scanning root folder:', ROOT_FOLDER);
      const items = await fs.readdir(ROOT_FOLDER, { withFileTypes: true });
      console.log('Items found:', items.length);
  
      const folders = await Promise.all(items
        .filter(item => item.isDirectory())
        .map(async item => {
          let projectId = '';
          let projectName = '';
          let type = '';
  
          const prjIdRegex = /^(\d+[-_]\d+)/;
          const match = prjIdRegex.exec(item.name);
          if (match) {
            projectId = match[1];
            const remaining = item.name.substring(projectId.length).split('_');
            projectName = remaining[1] || '';
            type = remaining.slice(2).join('_');
          } else {
            const parts = item.name.split('_');
            projectId = 'N/A';
            projectName = parts.slice(0, -1).join('_');
            type = parts[parts.length - 1] || '';
          }
  
          const fullPath = path.join(ROOT_FOLDER, item.name);
          recordDirectory(fullPath);
          const firstSeen = getFirstSeen(fullPath);
  
          return {
            fullName: item.name,
            projectId,
            projectName,
            type,
            firstSeen
          };
        }));
  
      console.log('Folders found:', folders.length);
      return folders;
    } catch (error) {
      console.error('Error scanning root folder:', error);
      throw new Error(`Failed to scan root folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
