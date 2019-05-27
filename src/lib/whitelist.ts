/**
 * Checks an input value against a whitelist (case-insensitive) - if found, then the value is
 * returned. If not found, then a default value is used instead.
 * 
 * Intended for use in whitelisting parameters from the client - for example, sort columns
 * 
 * @param input The input value
 * @param valid A list of valid values that could be returned
 * @param defval A default value to use if none was found or if the input was undefined
 */
export default function whitelist(input: string | undefined, valid: string[], defval: string): string {
    if (input === null || input === undefined) return defval;

    input = input.toLowerCase();

    for (var i = 0; i < valid.length; i++) {
        if (input === valid[i].toLowerCase()) return input;
    }
    return defval;
}