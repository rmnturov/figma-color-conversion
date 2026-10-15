export async function resetVariableImportFixtures(figma, { collectionName, sentinel } = {}) {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const collection = (await figma.variables.getLocalVariableCollectionsAsync())
        .find(c => c.name === collectionName);
    if (!collection) throw new Error('Missing test collection: ' + collectionName);
    const variables = (await figma.variables.getLocalVariablesAsync('COLOR'))
        .filter(v => v.variableCollectionId === collection.id);
    for (const variable of variables) {
        for (const mode of collection.modes) variable.setValueForMode(mode.modeId, sentinel);
    }
    return {
        fileKey: figma.fileKey,
        collectionId: collection.id,
        modes: collection.modes,
        variables: variables.map(v => ({ id: v.id, name: v.name, values: v.valuesByMode }))
    };
}
