import { CliOptions } from './_interfaces/cli-options.interface'
import {parseTsFile, saveParsedDataToFile} from "./parsers/ts.parser";

export const generateAppInDepth = (options: CliOptions): void => {
    console.log(`Generating diagram for project located at: ${options.root}`);
    console.log(`Format: ${options.format}`);
    console.log(`Filter: ${options.filter.join(', ')}`);
    console.log(`Group by: ${options.groupBy}`);

    // Main logic to generate the diagram
    if (options.format === 'drawio') {
        const result = parseTsFile(options.root)
        // Сохраняем результат в файл
        saveParsedDataToFile(result, 'output/parsedResult.json');
    } else {
        console.log(`Unsupported format: ${options.format}`);
    }
};
