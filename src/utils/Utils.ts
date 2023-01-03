export function removeInvalidChar_RegExp(str: string): string {
    const removeChar = str.replace(/[/\\?%*:|"<>]/g, '-'); 
    const removeCharEscape = removeChar.replace(/(?:\r\n|\r|\n)/g, ' - ')
    return removeCharEscape
}

export function checkHighlightNote_RegExp(str: string): boolean {
    const reg_exp = /(^[A-Za-z]+ [0-9]+).*( @ (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}))$/;
    return reg_exp.test(str);
}
function noteTitle_RegExp(noteTitle: string): string {
    // replace \ / and : with _
    noteTitle = noteTitle.replace(/\\|\/|:/g, ',');
    // replace multiple underscores with one underscore
    noteTitle = noteTitle.replace(/_+/g, '_');
    // remove leading and trailing whitespace
    noteTitle = noteTitle.trim();
    // remove leading and trailing underscores 
    noteTitle = noteTitle.replace(/^_+|_+$/g, '');
    // replace multiple spaces with one space
    noteTitle = noteTitle.replace(/\s+/g, ' ');
    return noteTitle
}
export function completeTitle(title: string,authors: string, options) {
    const clean_title = noteTitle_RegExp(title)
    const clean_authors = noteTitle_RegExp(authors)
    let managedTitle = `${clean_title}`+' - '+`${clean_authors}`;

    // add prefixes and suffixes
    managedTitle = `${options.prefix || ''} ${managedTitle}`;
    return managedTitle
}
export function manageTitle(title: string, options) {
    // remove invalid windows characters
    title = title.replace(/[~"#%&*:<>?/\\{|}]+/g, '_');
    if (options.maxLength && title.length > options.maxLength) {
        title = `${title.substring(0, options.maxLength).trim()}_`;
    }
    // if options.maxWords is set, trim the title to that number of words and add '...'
    if (options.maxWords && title.split(' ').length > options.maxWords) {
        title = `${title.split(' ').slice(0, options.maxWords).join(' ')}_`;
    }
    // windows max filename length of 256
    if (title.length > 256) {
        title = `${title.substring(0, 253).trim()}_`;
    }
    return title
}