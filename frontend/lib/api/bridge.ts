const bridgeURL = 'https://api.bridgedataoutput.com/api/v2/pub/';

type Resource = 'parcels' | 'assessments' | 'transactions';

// TODO: rename this to avoid incorrect imports in other files (overlapping name with main makeRequest fn)
const makeRequest = async (resourceType: Resource, queryParams: object) => {
  let url = `${bridgeURL}${resourceType}?access_token=${process.env.BRIDGE_SERVER_TOKEN}`;
  
  // Code for the case when I pass the access token as a header
  // let url = `${bridgeURL}${resourceType}`;
  // if (queryParams) {  // TODO: test for {} case
  //   // get first key/value pair
  //   let keyName = Object.keys(queryParams)[0];
  //   let keyValue = queryParams[keyName as keyof typeof queryParams];
  //   url += `?${keyName}=${keyValue}`;
  //   delete queryParams[keyName as keyof typeof queryParams];
  // }

  // add remaining key/value pairs
  for (let key in queryParams) {
    url += `&${key}=${queryParams[key as keyof typeof queryParams]}`
  }

  const response = await fetch(url, {
    // headers: {
    //   // Authentication: `Bearer ${process.env.BRIDGE_SERVER_TOKEN}`
    // }
  });
  return response;
}


const test = async () => {
  const resourceType = 'parcels';

  let queryParams = {
    // zpid: 55023086,
    // address: {
    //   full: '123 Main Street'
    // },
    // 'address.full': '""',
    // near: 
    limit: 1
    // sortBy: 'year'
  };

  const response = await makeRequest(resourceType, queryParams);
  const data = await response.json();
  console.log(data);
  console.log(data.bundle[0].address);
}

// test();
