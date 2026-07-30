import { App, TFile } from 'obsidian';
import { useEffect, useState } from 'react';

interface VaultAnalytics {
	totalFiles: number;
	totalFolders: number;
	totalAttachments: number;
	recentFiles: { name: string; path: string; mtime: number }[];
	fileTypes: Record<string, number>;
	totalTags: number;
	orphanNotes: { name: string; path: string }[];
	totalOrphans: number;
}

function getAnalytics(app: App): VaultAnalytics {
	const all = app.vault.getAllLoadedFiles();
	const files = all.filter((f) => f instanceof TFile);
	const folders = all.filter((f) => !(f instanceof TFile));

	const markdownFiles = app.vault.getMarkdownFiles();
	const tagSet = new Set<string>();
	for (const f of markdownFiles) {
		const cache = app.metadataCache.getFileCache(f);
		if (cache?.tags) {
			for (const t of cache.tags) {
				tagSet.add(t.tag);
			}
		}
		const fm = cache?.frontmatter;
		if (fm?.tags) {
			const tags = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
			for (const t of tags) {
				tagSet.add(`#${t}`);
			}
		}
	}

	const orphans = markdownFiles.filter((f) => {
		const cache = app.metadataCache as unknown as {
			getBacklinksForFile(
				file: TFile,
			): { resolved: Record<string, unknown>; unresolved: Record<string, unknown> };
		};
		const backlinks = cache.getBacklinksForFile(f);
		const resolved = Object.keys(backlinks?.resolved ?? {}).length;
		const unresolved = Object.keys(backlinks?.unresolved ?? {}).length;
		return resolved + unresolved === 0;
	});

	const sorted = [...files].sort((a, b) => b.stat.mtime - a.stat.mtime);
	const recentFiles = sorted.slice(0, 5).map((f) => ({
		name: f.name,
		path: f.path,
		mtime: f.stat.mtime,
	}));

	const fileTypes: Record<string, number> = {};
	let totalAttachments = 0;
	for (const f of files) {
		const ext = f.extension;
		fileTypes[ext] = (fileTypes[ext] ?? 0) + 1;
		if (ext !== 'md') totalAttachments++;
	}

	return {
		totalFiles: files.length,
		totalFolders: folders.length,
		totalAttachments,
		recentFiles,
		fileTypes,
		totalTags: tagSet.size,
		orphanNotes: orphans.slice(0, 10).map((f) => ({
			name: f.name,
			path: f.path,
		})),
		totalOrphans: orphans.length,
	};
}

async function openFile(app: App, path: string) {
	const file = app.vault.getAbstractFileByPath(path);
	if (file instanceof TFile) {
		await app.workspace.getLeaf('tab')?.openFile(file);
	}
}

export const ReactView = ({ app }: { app: App }) => {
	const [data, setData] = useState<VaultAnalytics | null>(null);

	useEffect(() => {
		setData(getAnalytics(app));
		const ref = app.vault.on('modify', () => setData(getAnalytics(app)));
		return () => app.vault.offref(ref);
	}, [app]);

	if (!data) return null;

	return (
		<div style={{ padding: '1rem' }}>
			<h2>Vault Analytics</h2>
			<ul>
				<li><strong>Files:</strong> {data.totalFiles}</li>
				<li><strong>Folders:</strong> {data.totalFolders}</li>
				<li><strong>Attachments:</strong> {data.totalAttachments}</li>
				<li><strong>Tags:</strong> {data.totalTags}</li>
			</ul>
			<h3>File types</h3>
			<ul>
				{Object.entries(data.fileTypes).map(([ext, count]) => (
					<li key={ext}><strong>{ext}</strong>: {count}</li>
				))}
			</ul>
			<h3>Orphan notes ({data.totalOrphans})</h3>
			{data.orphanNotes.length === 0 ? (
				<p>No orphans — every note has backlinks!</p>
			) : (
				<ul>
					{data.orphanNotes.map((f) => (
						<li key={f.path}>
							<a
								href="#"
								onClick={(e) => {
									e.preventDefault();
									void openFile(app, f.path);
								}}
							>
								{f.name}
							</a>
						</li>
					))}
				</ul>
			)}
			<h3>Recently modified</h3>
			<ol>
				{data.recentFiles.map((f) => (
					<li key={f.path}>
						<a
							href="#"
							onClick={(e) => {
								e.preventDefault();
								void openFile(app, f.path);
							}}
						>
							{f.name}
						</a>
						{' — '}{new Date(f.mtime).toLocaleDateString()}
					</li>
				))}
			</ol>
		</div>
	);
};
