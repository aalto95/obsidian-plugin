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
	taglessNotes: { name: string; path: string }[];
	totalTagless: number;
	shortNotes: { name: string; path: string; words: number }[];
	topLinked: { name: string; path: string; count: number }[];
}

function getAnalytics(app: App): VaultAnalytics {
	const all = app.vault.getAllLoadedFiles();
	const files = all.filter((f): f is TFile => f instanceof TFile).filter(
		(f) => !f.path.startsWith('Archives/'),
	);
	const folders = all.filter((f) => !(f instanceof TFile));

	const markdownFiles = app.vault.getMarkdownFiles().filter(
		(f) => !f.path.startsWith('Archives/'),
	);
	const tagSet = new Set<string>();
	const filesWithTags = new Set<string>();
	for (const f of markdownFiles) {
		const cache = app.metadataCache.getFileCache(f);
		let hasTags = false;
		if (cache?.tags) {
			for (const t of cache.tags) {
				tagSet.add(t.tag);
				hasTags = true;
			}
		}
		const fm = cache?.frontmatter;
		if (fm?.tags) {
			const tags = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
			for (const t of tags) {
				tagSet.add(`#${t}`);
				hasTags = true;
			}
		}
		if (hasTags) filesWithTags.add(f.path);
	}

	const taglessNotes = markdownFiles.filter(
		(f) => !filesWithTags.has(f.path),
	);

	const backlinkCounts = new Map<string, number>();
	const accumulateBacklinks = (targets: Record<string, number>) => {
		for (const target of Object.keys(targets)) {
			backlinkCounts.set(target, (backlinkCounts.get(target) ?? 0) + 1);
		}
	};
	for (const targets of Object.values(app.metadataCache.resolvedLinks)) {
		accumulateBacklinks(targets);
	}
	for (const targets of Object.values(app.metadataCache.unresolvedLinks)) {
		accumulateBacklinks(targets);
	}

	const orphans = markdownFiles.filter(
		(f) => (backlinkCounts.get(f.path) ?? 0) === 0,
	);

	const SHORT_NOTE_BYTES = 300;
	const shortNotes = markdownFiles
		.filter((f) => f.stat.size < SHORT_NOTE_BYTES)
		.sort((a, b) => a.stat.size - b.stat.size)
		.slice(0, 10)
		.map((f) => ({
			name: f.name,
			path: f.path,
			words: Math.round(f.stat.size / 6),
		}));

	const topLinked = markdownFiles
		.map((f) => ({ path: f.path, count: backlinkCounts.get(f.path) ?? 0 }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5)
		.map(({ path, count }) => ({
			name: path.split('/').pop() ?? path,
			path,
			count,
		}));

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
		taglessNotes: taglessNotes.slice(0, 10).map((f) => ({
			name: f.name,
			path: f.path,
		})),
		totalTagless: taglessNotes.length,
		shortNotes,
		topLinked,
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
		const ref2 = app.metadataCache.on('resolved', () =>
			setData(getAnalytics(app)),
		);
		return () => {
			app.vault.offref(ref);
			app.metadataCache.offref(ref2);
		};
	}, [app]);

	if (!data) return null;

	return (
		<div style={{ padding: '1rem' }}>
			<h2>Vault Analytics</h2>
			<ul>
				<li>
					<strong>Files:</strong> {data.totalFiles}
				</li>
				<li>
					<strong>Folders:</strong> {data.totalFolders}
				</li>
				<li>
					<strong>Attachments:</strong> {data.totalAttachments}
				</li>
				<li>
					<strong>Tags:</strong> {data.totalTags}
				</li>
			</ul>
			<h3>File types</h3>
			<ul>
				{Object.entries(data.fileTypes).map(([ext, count]) => (
					<li key={ext}>
						<strong>{ext}</strong>: {count}
					</li>
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
			<h3>Tagless notes ({data.totalTagless})</h3>
			{data.taglessNotes.length === 0 ? (
				<p>No tagless notes — every note has tags!</p>
			) : (
				<ul>
					{data.taglessNotes.map((f) => (
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
			<h3>Most linked notes</h3>
			{data.topLinked.length === 0 ? (
				<p>No data yet.</p>
			) : (
				<ol>
					{data.topLinked.map((f) => (
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
							{' — '}
							{f.count} backlinks
						</li>
					))}
				</ol>
			)}
			<h3>Short notes</h3>
			{data.shortNotes.length === 0 ? (
				<p>No short notes.</p>
			) : (
				<ol>
					{data.shortNotes.map((f) => (
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
							{' — '}
							~{f.words} words
						</li>
					))}
				</ol>
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
						{' — '}
						{new Date(f.mtime).toLocaleDateString()}
					</li>
				))}
			</ol>
		</div>
	);
};
