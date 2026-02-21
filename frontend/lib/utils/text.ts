export const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const convertCharToSpacesAndCapitalize = (str: string, char: string = "-") => {
  // convert dashses to spaces and capitalize each word
  return str.split(char).map(word => capitalizeFirstLetter(word)).join(' ');
}