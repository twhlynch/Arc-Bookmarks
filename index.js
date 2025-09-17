const inputElement = document.getElementById("input");
const downloadElement = document.getElementById("download");

downloadElement.addEventListener("click", () => {
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
  let items = parseArcData(arcData);

  let bookmarks = [];

  for (let item of items) {
    const isTopLevel = item.parentID == null;
    if (!isTopLevel) {
      for (let item2 of items) {
        if (item2.ID == item.parentID && item2.childIDs.includes(item.ID)) {
          item2.children.push(item);
        }
      }
    } else {
      bookmarks.push(item);
    }
  }

  // remove unpinned tabs
  bookmarks = bookmarks.filter(
    (bm) =>
      bm.ID !== "thebrowser.company.defaultPersonalSpaceUnpinnedContainerID",
  );

  console.log(bookmarks);
  return convertJsonToBookmarks(bookmarks);
}

function convertJsonToBookmarks(items) {
  let bookmarks = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>
  <DL><p>
    ${items.map((item) => createBookmark(item))}
  </DL><p>
</DL><p>
`;

  return bookmarks;
}

function createBookmark(item) {
  return item.children.length
    ? `
<DT><H3>${item.title}</H3>
<DL><p>
  ${item.children.map((child) => createBookmark(child))}
</DL><p>
`
    : `
<DT><A HREF="${item.url}" >${item.title}</A>
`;
}

function parseArcData(data) {
  let items = [];
  const containers = data.sidebar.containers;
  for (const container of containers) {
    if (container.items) {
      for (const item of container.items) {
        if (typeof item !== "string") {
          console.log(item);
          items.push({
            ID: item.id || null,
            url: item.data?.tab?.savedURL || null,
            title: item.title || item.data?.tab?.savedTitle || "Pinned",
            parentID: item.parentID || null,
            childIDs: item.childrenIds || [],
            children: [],
          });
        }
      }
    }
  }
  return items;
}

function download(text) {
  const blob = new Blob([text], { type: "text/" });
  let a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = "bookmarks.html";
  a.click();
}
