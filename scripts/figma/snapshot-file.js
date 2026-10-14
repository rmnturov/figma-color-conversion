// Read-only standard Plugin API helper. The profile is verified separately in the UI.
export async function snapshotFile(figma, { pageId = '0:1', section = 'hierarchy' } = {}) {
    const page = await figma.getNodeByIdAsync(pageId);
    if (!page || page.type !== 'PAGE') throw new Error('Missing page: ' + pageId);
    await figma.setCurrentPageAsync(page);
    if (section === 'hierarchy') {
        return {
            fileKey: figma.fileKey ?? null,
            nodes: [page, ...page.findAll()].map(n => [n.id, n.type, n.name, n.parent?.id ?? null])
        };
    }
    if (section === 'variables') {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const variables = await figma.variables.getLocalVariablesAsync('COLOR');
        return {
            fileKey: figma.fileKey ?? null,
            collections: collections.map(c => ({ id: c.id, name: c.name, modes: c.modes })),
            variables: variables.map(v => ({
                id: v.id,
                name: v.name,
                collectionId: v.variableCollectionId,
                scopes: v.scopes,
                values: v.valuesByMode
            }))
        };
    }
    if (section === 'rectangles') {
        return page.findAll(n => n.type === 'RECTANGLE').map(n => ({
            id: n.id, name: n.name, fills: n.fills, opacity: n.opacity, boundVariables: n.boundVariables
        }));
    }
    throw new Error('Unknown snapshot section: ' + section);
}
