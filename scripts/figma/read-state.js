// Standard Figma Plugin API. Use a verified document profile from the UI.
export async function readColorState(figma, { rootId, profile } = {}) {
    if (!['p3', 'srgb'].includes(profile)) {
        throw new Error('Specify a document profile verified in the Figma UI');
    }
    const root = rootId ? await figma.getNodeByIdAsync(rootId) : figma.currentPage;
    if (!root) throw new Error('The requested root node does not exist');
    let page = root;
    while (page && page.type !== 'PAGE') page = page.parent;
    if (page) await figma.setCurrentPageAsync(page);
    const nodes = [root, ...('findAllWithCriteria' in root
        ? root.findAllWithCriteria({ types: ['RECTANGLE', 'FRAME', 'INSTANCE', 'TEXT'] })
        : [])];
    const variables = new Map();
    async function readVariable(id, consumer) {
        if (variables.has(id)) return;
        const variable = await figma.variables.getVariableByIdAsync(id);
        if (!variable) throw new Error('Missing variable: ' + id);
        const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
        variables.set(id, {
            id: variable.id,
            name: variable.name,
            collectionId: variable.variableCollectionId,
            collectionName: collection?.name,
            modes: collection?.modes,
            values: variable.valuesByMode,
            exampleConsumerId: consumer.id,
            exampleResolved: variable.resolveForConsumer(consumer)
        });
        for (const value of Object.values(variable.valuesByMode)) {
            if (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
                await readVariable(value.id, consumer);
            }
        }
    }
    const records = [];
    for (const node of nodes) {
        if (!('fills' in node) || !Array.isArray(node.fills)) continue;
        const paints = [];
        for (const fill of node.fills) {
            if (fill.type !== 'SOLID') continue;
            const variableId = fill.boundVariables?.color?.id;
            let resolved = null;
            if (variableId) {
                await readVariable(variableId, node);
                const variable = await figma.variables.getVariableByIdAsync(variableId);
                resolved = variable.resolveForConsumer(node);
            }
            paints.push({ fill, variableId, resolved });
        }
        records.push({
            id: node.id,
            name: node.name,
            type: node.type,
            opacity: 'opacity' in node ? node.opacity : null,
            resolvedVariableModes: 'resolvedVariableModes' in node ? node.resolvedVariableModes : null,
            paints
        });
    }
    return {
        fileKey: figma.fileKey ?? null,
        profile,
        rootId: root.id,
        pageId: page?.id,
        records,
        variables: [...variables.values()]
    };
}
