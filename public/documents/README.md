# Document data

Each JSON file contains `id`, `title`, `description`, and `blocks`.

Blocks contain structured text, headings, paragraphs, lists, tables, links and images. Text is stored as `text`; nested content is stored as `children`. Images contain `src` (a local offline asset path) and `alt`. Source anchor IDs are retained as `id` so links can navigate to specific sections.

The reader renders these data objects directly using its own React components and stylesheet. It does not load the original HTML, headers, footers, scripts or styles.

`index.json` lists all extracted document IDs and titles. The temporary HTML archive has been removed. To refresh the data, run `npm run offline:build`; this downloads the source pages again and regenerates the JSON. `npm run documents:build` requires those downloaded source pages to be present.
