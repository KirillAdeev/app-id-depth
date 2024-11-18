#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateAppInDepth } from '../index';
import { CliOptions } from "../_interfaces/cli-options.interface";

// Define the command-line interface using yargs
const argv = yargs(hideBin(process.argv))
    .scriptName('aid') // Sets the CLI script name to 'aid'
    .usage('$0 [options]') // Usage message to show when the command is called
    .option('root', {
        alias: 'r', // Short version of the 'root' option
        type: 'string',
        description: 'The root folder to analyze', // Description for the root folder option
        default: 'src' // Default value for the root folder
    })
    .option('format', {
        alias: 'f', // Short version of the 'format' option
        type: 'string',
        description: 'The output format (e.g., drawio, svg, etc.)',
        default: 'drawio' // Default output format
    })
    .option('filter', {
        alias: 't', // Short version of the 'filter' option
        type: 'array',
        description: 'Filter files or entities to include in the analysis', // Description of filter option
        default: [] // Default empty filter array
    })
    .option('groupBy', {
        alias: 'g', // Short version of the 'groupBy' option
        type: 'string',
        description: 'Group entities by type, folder, or module', // Description of groupBy option
        default: 'folder' // Default groupBy value
    })
    .help() // Displays help information
    .alias('help', 'h') // Aliasing 'help' to 'h'
    .argv; // Parse the arguments passed to the command

// Check if argv is a Promise, and resolve it if necessary
const resolveOptions = async () => {
    const options: CliOptions = await argv;
    generateAppInDepth(options);
};

resolveOptions();
