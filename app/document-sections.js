// Remove layout groups and organize the content by its heading hierarchy.
export function documentSections(blocks) {
    function flatten(nodes) {
        return nodes.flatMap(node => node.type === 'group'
            ? [...(node.id ? [{type: 'anchor', id: node.id}] : []), ...flatten(node.children ?? [])]
            : [node]);
    }

    const root = {children: []};
    const stack = [{level: 0, section: root}];
    for (const node of flatten(blocks)) {
        if (node.type === 'heading') {
            const level = node.level ?? 2;
            while (stack.length > 1 && stack.at(-1).level >= level) stack.pop();
            const section = {type: 'section', heading: node, children: []};
            stack.at(-1).section.children.push(section);
            stack.push({level, section});
        } else {
            stack.at(-1).section.children.push(node);
        }
    }
    const firstSection = root.children.findIndex(node => node.type === 'section');
    const introduction = firstSection < 0 ? root.children : root.children.slice(0, firstSection);
    return [
        ...introduction,
        ...(firstSection < 0 ? [] : root.children.slice(firstSection)),
    ];
}
