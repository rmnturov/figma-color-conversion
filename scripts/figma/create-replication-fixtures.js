// Standard Figma Plugin API. The file does not run in Node.js.
// For use_figma: remove "export" and append
// Use a new blank Design file and pass seeds from preregistered predictions.json:
// return await createForwardFixtures(figma, { seeds: specimens.map(s => ({key:s.key,rgb:s.inputP3})) });

export async function createForwardFixtures(figma, {
    collectionName = 'Replication 01',
    seeds,
    offsetX = 80,
    offsetY = 80
} = {}) {
    const existing = await figma.variables.getLocalVariableCollectionsAsync();
    if (existing.some(c => c.name === collectionName)) {
        throw new Error('Use a new collection name for each research run');
    }
    const fonts = await figma.listAvailableFontsAsync();
    if (!fonts.some(item => item.fontName.family === 'Inter' && item.fontName.style === 'Regular')) throw new Error('Inter Regular unavailable');
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const createdNodeIds = [];
    const variableIds = [];
    const collection = figma.variables.createVariableCollection(collectionName);
    collection.renameMode(collection.modes[0].modeId, 'P3 values');
    const modeId = collection.modes[0].modeId;
    function frame(name, direction) {
        const node = figma.createAutoLayout(direction);
        createdNodeIds.push(node.id);
        node.name = name;
        node.layoutMode = direction;
        node.primaryAxisSizingMode = 'AUTO';
        node.counterAxisSizingMode = 'AUTO';
        node.itemSpacing = 16;
        node.fills = [];
        return node;
    }
    function label(parent, text) {
        const node = figma.createText();
        createdNodeIds.push(node.id);
        node.fontName = { family: 'Inter', style: 'Regular' };
        node.fontSize = 14;
        node.characters = text;
        node.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
        parent.appendChild(node);
    }
    const sheet = frame(collectionName, 'VERTICAL');
    sheet.x = offsetX;
    sheet.y = offsetY;
    sheet.paddingTop = 24;
    sheet.paddingBottom = 24;
    sheet.paddingLeft = 24;
    sheet.paddingRight = 24;
    sheet.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    label(sheet, 'Display-P3: literal / variable / two aliases');
    const records = [];
    for (const seed of seeds) {
        const row = frame(seed.key, 'HORIZONTAL');
        sheet.appendChild(row);
        const variables = [];
        for (const [prefix, index] of [['primitive', null], ['semantic', 0], ['role', 1]]) {
            const variable = figma.variables.createVariable(prefix + '/' + seed.key, collection, 'COLOR');
            variableIds.push(variable.id);
            variable.scopes = ['SHAPE_FILL'];
            variable.setValueForMode(modeId, index === null
                ? { r: seed.rgb[0], g: seed.rgb[1], b: seed.rgb[2], a: 1 }
                : { type: 'VARIABLE_ALIAS', id: variables[index].id });
            variables.push(variable);
        }
        for (const type of ['literal', 'variable', 'alias2']) {
            const cell = frame(seed.key + ' ' + type, 'VERTICAL');
            row.appendChild(cell);
            label(cell, seed.key + ' / ' + type);
            const node = figma.createRectangle();
            createdNodeIds.push(node.id);
            node.name = seed.key + '-' + type;
            node.resize(256, 100);
            cell.appendChild(node);
            let paint = { type: 'SOLID', color: { r: seed.rgb[0], g: seed.rgb[1], b: seed.rgb[2] } };
            const variable = type === 'literal' ? null : variables[type === 'variable' ? 0 : 2];
            if (variable) paint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
            node.fills = [paint];
            records.push({ name: node.name, id: node.id, type, p3: seed.rgb, variableId: variable?.id ?? null });
        }
    }
    const importCollection = figma.variables.createVariableCollection('Paired import');
    const probe = figma.variables.createVariable('color-space-probe', importCollection, 'COLOR');
    probe.scopes = ['SHAPE_FILL'];
    probe.setValueForMode(importCollection.modes[0].modeId, {r:.03125,g:.0625,b:.125,a:.75});
    return { createdNodeIds, variableIds, collectionId: collection.id, modeId, sheetId: sheet.id, pageId:figma.currentPage.id, records, importCollectionId:importCollection.id, importModeId:importCollection.modes[0].modeId, importVariableId:probe.id };
}
