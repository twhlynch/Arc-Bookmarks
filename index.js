const inputElement = document.getElementById('input');

inputElement.addEventListener('change', () => {
	const files = inputElement.files;
	if (files.length) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const arcData = e.target.result;
			if (arcData) {
				const bookmarksData = convert(JSON.parse(arcData));
				download(bookmarksData);
			}
		};
		reader.readAsText(files[0]);
	}
});

function convert(arcData) {
	let items = parseBookmarks(arcData);
	let spaces = parseSpaces(arcData);

	let bookmarks = [];

	for (let item of items) {
		const isTopLevel = item.parentID == null;
		if (!isTopLevel) {
			for (let item2 of items) {
				if (
					item2.ID == item.parentID &&
					item2.childIDs.includes(item.ID)
				) {
					item2.children.push(item);
				}
			}
		} else {
			bookmarks.push(item);
		}
	}

	let allUnpinnedIDs = new Set();
	for (let space of spaces) {
		for (let id of space.unpinnedContainerIDs) {
			allUnpinnedIDs.add(id);
		}
	}

	let topAppsItem = bookmarks.find((b) => b.isTopApps);

	let result = [];

	for (let space of spaces) {
		let pinnedItem = bookmarks.find(
			(b) => b.ID === space.pinnedContainerID,
		);
		if (!pinnedItem) continue;

		let spaceBookmarks = [];

		if (
			topAppsItem &&
			space.id === 'thebrowser.company.defaultPersonalSpaceID'
		) {
			spaceBookmarks.push(...topAppsItem.children);
		}

		spaceBookmarks.push(
			...pinnedItem.children.filter(
				(child) => !allUnpinnedIDs.has(child.ID),
			),
		);

		if (spaceBookmarks.length) {
			result.push({ title: space.title, bookmarks: spaceBookmarks });
		}
	}

	return convertJsonToBookmarks(result);
}

function parseSpaces(data) {
	let spaces = [];
	const containers = data.sidebar.containers;
	for (const container of containers) {
		if (container.spaces) {
			for (let i = 0; i < container.spaces.length; i++) {
				const entry = container.spaces[i];
				if (typeof entry === 'string') {
					const spaceObj = container.spaces[i + 1];
					if (spaceObj && spaceObj.containerIDs) {
						let pinnedContainerID = null;
						let unpinnedContainerIDs = [];
						const containerIDs = spaceObj.containerIDs;
						for (let j = 0; j < containerIDs.length; j++) {
							if (
								containerIDs[j] === 'pinned' &&
								j + 1 < containerIDs.length
							) {
								pinnedContainerID = containerIDs[j + 1];
							} else if (
								containerIDs[j] === 'unpinned' &&
								j + 1 < containerIDs.length
							) {
								unpinnedContainerIDs.push(containerIDs[j + 1]);
							}
						}
						spaces.push({
							id: entry,
							title: spaceObj.title,
							pinnedContainerID,
							unpinnedContainerIDs,
						});
					}
				}
			}
		}
	}
	return spaces;
}

function parseBookmarks(data) {
	let items = [];
	const containers = data.sidebar.containers;
	for (const container of containers) {
		if (container.items) {
			for (const item of container.items) {
				if (typeof item !== 'string') {
					items.push({
						ID: item.id || null,
						url: item.data?.tab?.savedURL || null,
						title:
							item.title ||
							item.data?.tab?.savedTitle ||
							'Pinned',
						parentID: item.parentID || null,
						childIDs: item.childrenIds || [],
						children: [],
						isTopApps:
							!!item.data?.itemContainer?.containerType?.topApps,
					});
				}
			}
		}
	}
	return items;
}

function convertJsonToBookmarks(spaces) {
	let bookmarks = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>
  <DL><p>
    ${spaces.map((space) => createSpace(space)).join('\n')}
  </DL><p>
</DL><p>
`;

	return bookmarks;
}

function createSpace(space) {
	return `
<DT><H3>${space.title}</H3>
<DL><p>
  ${space.bookmarks.map((item) => createBookmark(item)).join('\n')}
</DL><p>
`;
}

function createBookmark(item) {
	return item.children.length
		? `
<DT><H3>${item.title}</H3>
<DL><p>
  ${item.children.map((child) => createBookmark(child)).join('\n')}
</DL><p>
`
		: `
<DT><A HREF="${item.url}" >${item.title}</A>
`;
}

function download(text) {
	const blob = new Blob([text], { type: 'text/' });
	let a = document.createElement('a');
	a.href = window.URL.createObjectURL(blob);
	a.download = 'bookmarks.html';
	a.click();
}
