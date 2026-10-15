export async function createVariableImportBoard(figma, { title } = {}) {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const variables = await figma.variables.getLocalVariablesAsync('COLOR');
    const board = figma.createAutoLayout('HORIZONTAL');
    figma.currentPage.appendChild(board);
    board.name = title;
    board.paddingLeft = board.paddingRight = board.paddingTop = board.paddingBottom = 24;
    board.itemSpacing = 24;
    board.primaryAxisSizingMode = 'AUTO';
    board.counterAxisSizingMode = 'AUTO';
    board.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    const specimens = [];
    for (const collection of collections) {
        const column = figma.createAutoLayout('VERTICAL');
        column.name = collection.name;
        column.fills = [];
        column.itemSpacing = 10;
        column.primaryAxisSizingMode = 'AUTO';
        column.counterAxisSizingMode = 'FIXED';
        column.resize(350, 40);
        board.appendChild(column);
        const heading = figma.createText();
        heading.fontName = { family: 'Inter', style: 'Regular' };
        heading.fontSize = 18;
        heading.characters = collection.name;
        heading.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
        column.appendChild(heading);
        for (const variable of variables.filter(v => v.variableCollectionId === collection.id)) {
            const row = figma.createAutoLayout('HORIZONTAL');
            row.name = variable.name;
            row.fills = [];
            row.itemSpacing = 10;
            row.primaryAxisSizingMode = 'AUTO';
            row.counterAxisSizingMode = 'AUTO';
            column.appendChild(row);
            const rectangle = figma.createRectangle();
            rectangle.name = variable.name;
            rectangle.resize(40, 24);
            row.appendChild(rectangle);
            rectangle.fills = [figma.variables.setBoundVariableForPaint(
                { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', variable
            )];
            const label = figma.createText();
            label.fontName = { family: 'Inter', style: 'Regular' };
            label.fontSize = 12;
            label.characters = variable.name;
            label.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            row.appendChild(label);
            specimens.push({
                id: rectangle.id,
                name: rectangle.name,
                variableId: variable.id,
                collectionId: collection.id
            });
        }
    }
    for (const column of board.children) {
        column.clipsContent = false;
        column.primaryAxisSizingMode = 'AUTO';
        column.layoutSizingVertical = 'HUG';
        for (const row of column.children.filter(n => n.type === 'FRAME')) {
            row.clipsContent = false;
            row.primaryAxisSizingMode = 'AUTO';
            row.counterAxisSizingMode = 'AUTO';
            row.layoutSizingVertical = 'HUG';
        }
    }
    board.clipsContent = false;
    board.counterAxisSizingMode = 'AUTO';
    figma.viewport.scrollAndZoomIntoView([board]);
    return { fileKey: figma.fileKey, pageId: figma.currentPage.id, boardId: board.id, specimens };
}
