import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import {alias} from "yargs";

// Функция для загрузки tsconfig.json
function loadTsConfig(filePath: string) {
    const tsConfig = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(tsConfig);
}

// Получаем алиасы из tsconfig
const tsConfig = loadTsConfig('tsconfig.json');
const aliases = tsConfig.compilerOptions.paths || {};

// Функция для проверки, является ли импорт вендорным
function isVendorImport(importPath: string) {
    Object.keys(aliases).some(alias => alias.replace('/*', ''))
    // Проверка на алиасы
    for (let alias in Object.keys(aliases)) {
        if (importPath.startsWith(alias.replace('/*', ''))) {
            return false; // Это внутренний импорт
        }
    }
    return true; // Вендорный импорт
}

// Функция для проверки, является ли импорт вендорным
function isAppImport(importPath: string) {
    return importPath.startsWith('.') || importPath.startsWith('/')  || [...new Set(Object.keys(loadTsConfig('tsconfig.json').compilerOptions.paths || {}).map(alias => alias.replace('/*', '')))].some(alias => importPath.startsWith(alias))
}

// Utility to get decorators
function getDecorators(node: ts.Node): ts.Decorator[] | undefined {
    // Check if the node can have decorators
    if (ts.canHaveDecorators(node)) {
        return ts.getDecorators(node) as ts.Decorator[] | undefined;
    }
    return undefined;
}

// Function to parse TypeScript file
export function parseTsFile(filePath: string) {
    const sourceFile = ts.createSourceFile(
        filePath,
        ts.sys.readFile(filePath) || '',
        ts.ScriptTarget.Latest,
        true,
    );

    const imports: { vendors: string[]; app: string[] } = { vendors: [], app: [] };
    const exportedEntities: any[] = [];

    ts.forEachChild(sourceFile, node => {
        // Handle imports
        if (ts.isImportDeclaration(node)) {
            const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
            const importNames = node.importClause?.namedBindings;
            if (importNames && ts.isNamedImports(importNames)) {
                importNames.elements.forEach(importElement => {
                    const importName = importElement.name.text;
                    if (isAppImport(importPath)) {
                        imports.app.push(importName); // Это импорт из приложения
                    } else {
                        imports.vendors.push(importName); // Это вендорный импорт
                    }
                });
            }
        }

        // Handle exported classes
        if (ts.isClassDeclaration(node) && hasExportModifier(node)) {
            const className = node.name?.text || '';
            const properties: string[] = [];
            const methods: string[] = [];

            node.members.forEach(member => {
                if (ts.isPropertyDeclaration(member)) {
                    const name = member.name.getText();
                    const type = member.type?.getText() || 'any';
                    const decorators = getDecorators(member);
                    if (decorators && decorators.length > 0) {
                        const decoratorName = decorators[0].expression.getText();
                        properties.push(`[@${decoratorName[0]}] ${name}: ${type}`);
                    } else {
                        properties.push(`${getModifiers(member)} ${name}: ${type}`);
                    }
                }

                if (ts.isMethodDeclaration(member) && !isAngularLifecycleMethod(member)) {
                    const name = member.name.getText();
                    const args = member.parameters.map(param => {
                        const paramName = param.name.getText();
                        const paramType = param.type?.getText() || 'any';
                        return `${paramName}: ${paramType}`;
                    });
                    const returnType = member.type?.getText() || 'void';
                    methods.push(`${name}(${args.join(', ')}): ${returnType}`);
                }
            });

            exportedEntities.push({
                name: className,
                type: 'class',
                properties,
                methods,
                imports: { vendors: imports.vendors, app: imports.app },
            });
        }

        // Handle other exportable entities
        if (ts.isVariableDeclaration(node) && hasExportModifier(node)) {
            const name = node.name.getText();
            const type = isFunction(node.initializer) ? 'function' : 'const';

            exportedEntities.push({
                name,
                type,
                imports: { vendors: imports.vendors, app: imports.app },
            });
        }
    });

    return exportedEntities;
}

// Utility to check if a node has export modifier
function hasExportModifier(node: ts.Node): boolean {
    if ('modifiers' in node && Array.isArray(node.modifiers)) {
        return node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    }
    return false;
}

// Utility to check if a node is a function
function isFunction(node: ts.Node | undefined): boolean {
    return !!node && (ts.isFunctionExpression(node) || ts.isArrowFunction(node));
}

function hasModifierOfKind(node: ts.Node, kind: ts.SyntaxKind): boolean {
    if ('modifiers' in node && Array.isArray(node.modifiers)) {
        return node.modifiers.some(modifier => modifier.kind === kind);
    }
    return false;
}

// Utility to get modifiers for a class member
function getModifiers(member: ts.ClassElement): string {
    let modifiers = '';
    if (hasModifierOfKind(member, ts.SyntaxKind.PrivateKeyword)) modifiers += '[p]';
    if (hasModifierOfKind(member, ts.SyntaxKind.ProtectedKeyword)) modifiers += '[l]';
    if (hasModifierOfKind(member, ts.SyntaxKind.ReadonlyKeyword)) modifiers += '[r]';
    return modifiers || '';
}

// Utility to check if a method is an Angular lifecycle method
function isAngularLifecycleMethod(method: ts.MethodDeclaration): boolean {
    const lifecycleMethods = [
        'ngOnInit',
        'ngAfterViewInit',
        'ngOnDestroy',
        'ngDoCheck',
        'ngAfterContentInit',
        'ngAfterContentChecked',
        'ngAfterViewChecked',
        'ngOnChanges',
    ];
    return lifecycleMethods.includes(method.name.getText());
}

export function saveParsedDataToFile(data: any, outputFilePath: string): void {
    try {
        const jsonData = JSON.stringify(data, null, 2); // Преобразуем объект в формат JSON
        const absolutePath = path.resolve(outputFilePath); // Получаем абсолютный путь
        fs.writeFileSync(absolutePath, jsonData, 'utf-8'); // Сохраняем данные в файл
        console.log(`Parsing result saved to ${absolutePath}`);
    } catch (error) {
        console.error('Error saving parsed data:', error);
    }
}

// Example usage
const result = parseTsFile('path/to/your/file.ts');
console.log(JSON.stringify(result, null, 2));
