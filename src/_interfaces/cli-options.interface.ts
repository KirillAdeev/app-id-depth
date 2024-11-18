import yargs, {Arguments} from "yargs";

export interface CliOptions extends Arguments {
    root: string;
    format: string;
    filter: (string | number)[];
    groupBy: string;
}