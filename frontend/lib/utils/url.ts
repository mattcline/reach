
// for 'localhost:3000?next=a&b=c&next=def&next=ghi'; as inputString and 'next=' as word it
// returns ['localhost:3000?', 'a&b=c&next=def&next=ghi']
export const splitByFirstOccurrenceOfWord = (inputString: string, word: string) => {
  const index = inputString.indexOf(word);
  if (index !== -1) {
    const firstPart = inputString.substring(0, index);
    const secondPart = inputString.substring(index + word.length);
    return [firstPart, secondPart];
  } else {
    return [inputString, '']; // If the word is not found, return the whole string as the first part and an empty string as the second part
  }
}

// returns everything after str in the searchParams (including any duplicate str)
export const getFollowingPathStr = (searchParams: URLSearchParams, str: string = 'next=') => {
  const searchParamsStr = decodeURIComponent(searchParams.toString());
  const [_, followingPath] = splitByFirstOccurrenceOfWord(searchParamsStr, str);
  return followingPath;
}

// concatenates pathname and searchParams if there are any searchParams
export const getPath = (pathname: string, searchParams: URLSearchParams) => {
  const searchParamsStr = decodeURIComponent(searchParams.toString());
  return `${pathname}${searchParamsStr ? `?${searchParamsStr}` : ''}`;
}

export const getSearchParam = (key: string, searchParams: URLSearchParams) => {
  let val = searchParams.get(key);
  if (!val) return null;

  // remove the next path from the value
  if (val.includes('?next=')) {
    // Split the value using '?next=' as separator and take the first part
    val = val.split('?next=')[0];
  }

  // remove the append path from the value
  if (val.includes('?append=')) {
    // Split the value using '&next=' as separator and take the first part
    val = val.split('?append=')[0];
  }

  return val;
}