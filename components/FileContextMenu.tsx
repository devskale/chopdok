// components/FileContextMenu.tsx
import React from 'react';
import { Menu } from '@headlessui/react';
import { MoreVertical, FileText, Edit, Eye } from 'lucide-react';

interface FileContextMenuProps {
  fileName: string;
  onSummarize: () => void;
  onViewSummary: () => void;
  onProposeName: () => void;
  onShowProposedName: () => void;
  hasSummary: boolean;
  hasProposedName: boolean;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  fileName,
  onSummarize,
  onViewSummary,
  onProposeName,
  onShowProposedName,
  hasSummary,
  hasProposedName
}) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
          <MoreVertical className="w-5 h-5" />
        </Menu.Button>
      </div>
      <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="px-1 py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-violet-500 text-white' : 'text-gray-900'
                } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                onClick={onSummarize}
              >
                <FileText className="w-5 h-5 mr-2" aria-hidden="true" />
                Summarize Document
              </button>
            )}
          </Menu.Item>
          {hasSummary && (
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`${
                    active ? 'bg-violet-500 text-white' : 'text-gray-900'
                  } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                  onClick={onViewSummary}
                >
                  <Eye className="w-5 h-5 mr-2" aria-hidden="true" />
                  View Summary
                </button>
              )}
            </Menu.Item>
          )}
        </div>
        <div className="px-1 py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-violet-500 text-white' : 'text-gray-900'
                } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                onClick={onProposeName}
              >
                <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                Propose Name
              </button>
            )}
          </Menu.Item>
          {hasProposedName && (
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`${
                    active ? 'bg-violet-500 text-white' : 'text-gray-900'
                  } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                  onClick={onShowProposedName}
                >
                  <Eye className="w-5 h-5 mr-2" aria-hidden="true" />
                  Show Proposed Name
                </button>
              )}
            </Menu.Item>
          )}
        </div>
      </Menu.Items>
    </Menu>
  );
};