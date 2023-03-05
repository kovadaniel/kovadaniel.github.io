import { ItemSelect, Open, Back, Save, CreateFile, CreateDirectory, Delete } from "./modules/controls.js";

const theDomain = 'https://eloquentfileserver.onrender.com';
const theBaseDirectory = 'content';

const buttonsInRow = 3; // decides how many buttons displayed in one bar (in one row)

export const folderIcon = `\u{1F4C1}`; // '📁'
export const fileIcon = '\u{1F4C4}'; // '📄'
export const emptyIconUrl = 'https://cdn-icons-png.flaticon.com/512/2377/2377914.png'

const baseControls = [ItemSelect, Open, Back, Save, CreateFile, CreateDirectory, Delete];

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export async function makeRequest(url = '', method = 'GET', data) {
    let response;
    try{
      if(data){
          response = await fetch(url, {
              method: method,
              headers: {'Content-Type': 'text/html',},
              body: data,
          });
      } else{
        response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'text/html',},
        })
      }
      console.log('[makeRequest] response:', response);
      return response.headers.get('content-type') == 'application/json' ?
              response.json():
              response.text();
    } catch (e){
        console.log(`Error occured during ${method} request, by this url ${url}, with this data ${data} in makeRequest:`, e);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return await makeRequest(url, method, data);
    }
}

async function handleAction(state, action) {
    if (action.type == "setSelectedOption") {
        let url = state.url + '/' + action.selectedItem;
        let responseAboutContent = await makeRequest(url, 'GET');
        return Object.assign({}, state, {selectedItem: action.selectedItem,
                                        content: responseAboutContent}); 
    }

    // Auxilliary function that requests the data from the server. 
    // Common for 'open' and 'back'.
    async function openDirectory(url, selItem){
        let responseAboutItems = await makeRequest(url, 'GET');
        console.log('[handleAction -> open] responseAboutItems:', responseAboutItems);
        let items = responseAboutItems.type == 'directory' && 
                    responseAboutItems.value == '' ? 
                    [] :
                    responseAboutItems.value.split('\n');
        let selectedItem = selItem ?  selItem : items[0];
        if(selectedItem){
            let url2 = url + '/' + selectedItem;
            let responseAboutContent = await makeRequest(url2, 'GET');
            console.log('[handleAction -> open] responseAboutContent:', responseAboutContent);
            return Object.assign({}, state, {items: items, selectedItem, 
                                            content: responseAboutContent,
                                            url: url})
        } else{
            return Object.assign({}, state, {items: items, selectedItem, 
                content: '',
                url: url})
        }
    }

    if(action.type == "open"){
        let url = state.url + '/' + state.selectedItem;
        return await openDirectory(url);
    }

    if(action.type == "back"){
        let urlArr = state.url.split('/');
        let selectedItem = urlArr[urlArr.length-1];
        let url = urlArr.slice(0, -1).join('/');
        return await openDirectory(url, selectedItem);
    }

    if(action.type == "save"){
        let url = state.url + '/' + state.selectedItem;
        makeRequest(url, 'PUT', state.content.value) // action.content is a STRING
        .catch(error => console.log(`Failed to save changes in file. URL: ${url}, error: ${error}`))
    }

    // where we change some data in file and move the focus from textarea, the content of the 
    // textarea is saved to the state.content, but IT IS NOT SAVED!
    if(action.type == "setContent"){
        return Object.assign({}, state, {content: {type: state.content.type, value: action.content}});
    }

    if(action.type == "createFile"){
        let name = prompt("Enter file name with format [.txt, etc.]:");
        if(name){
            let url = state.url + '/' + name;
            let content = {type: 'file', value: state.content.value};
            makeRequest(url, 'PUT', content.value)
            .catch(error => console.log(`Failed to create a new file url: ${url}, error: ${error}`));
            return Object.assign({}, state, { content : content, 
                                              items: state.items.concat([name]), 
                                              selectedItem: name, });
        }
    }

    if(action.type == "createDirectory"){
        let name = prompt("Enter directory name:");
        if(name){
            let url = state.url + '/' + name;
            //console.log("[handleAction -> createDirectory] url", url);
            makeRequest(url, 'MKCOL')
            .catch(error => console.log(`Failed to create a new file url: ${url}, error: ${error}`));
            return Object.assign({}, state, {items: state.items.concat([name]), 
                                             selectedItem: name, 
                                             content: {type: "directory", value: ''}});
        }
    }

    if(action.type == "delete"){
        if(state.selectedItem){
            let url = state.url + '/' + state.selectedItem;
            makeRequest(url, 'DELETE')
            .catch(error => console.log(`Failed to delete file. URL: ${url}, error: ${error}`));

            let items = state.items.filter(el => el != state.selectedItem);
            if(items.length){
                let url = state.url + '/' + items[0];
                let response = await makeRequest(url, 'GET');
                return Object.assign({}, state, { content: response,
                                                  items: items, 
                                                  selectedItem: items[0]});
            } else{
                return Object.assign({}, state, { content: '',
                                                  items: [], 
                                                  selectedItem: ''});
            }

            
        }
    }

    // if the action is unknown:
    return state;
}

class FileApp{
    constructor(state, config){
        /* state will look like:
        state = {items: [Array-of-items], 
                 selectedItem : "Item-value",
                 content: {type: "directory"/"file"/"", 
                           value: "string-with-the-content-of-the-item"} 
            // or
                 content: "string-with-the-content-of-the-file-item", // when it is a file
                 url: 'baseUrl.../parentFolder/childFolder',
                }
        */
        this.state = {};
        let {controls, dispatch} = config;
        this.dispatch = dispatch;

        this.dom = document.querySelector('#container');
        
        this.crumblesDOM = document.querySelector('#crumbles');
        this.contentDOM = elt("textarea", 
            {   id : "content",
                name : "content",
                onblur: 
                (e) => {
                    e.preventDefault();
                    console.log('[dispatch in contentDOM] this.contentDOM.value:', this.contentDOM.value);
                    dispatch({type: 'setContent', 
                              content : this.contentDOM.value})
                }});

        this.controls = controls.map(
            Control => new Control(state, dispatch));

        // here we group controls (buttons) by buttonsInRow (default: by 3) items
        let groupedControls = this.controls.slice(1)
        .reduce((acc, cV, cI) => {
            if(cI%buttonsInRow == 0){
                acc.push([]);
            }
            acc[Math.floor(cI/buttonsInRow)].push(cV);
            return acc;
        }, []);

        this.formDOM = elt(
            'form', 
            {
                id: "messageForm", 
                action: state.url,
                method: "get",
                target: "_blank"
            },
            this.contentDOM, // our textarea
            this.controls[0].dom, // our select
            // our buttons, gathered by buttonsInRow (default: by 3) items
            elt('div', {id: 'bar-panel'},
                ...groupedControls.map(ctrlGroup => elt('div', {className: 'bar'},
                                                ...ctrlGroup.map(ctrl => ctrl.dom)))));

        this.dom.appendChild(this.formDOM);

        this.syncState(state);
    }

    syncState(state){
        if(this.state != state){
            console.log("[syncState] state:", state);

            this.contentDOM.value = typeof state.content == 'object' ? state.content.value : state.content;
            
            let crumbles = state.url.split('/').slice(4).join('/');
            this.crumblesDOM.innerHTML = '/' + crumbles;
            this.formDOM.action = state.url + '/' + state.selectedItem;

            this.state = state; 
            for (let ctrl of this.controls) ctrl.syncState(state);
        }
    }
}


function elt(type, props, ...children) {
    let dom = document.createElement(type);
    if (props) Object.assign(dom, props);
    for (let child of children) {
      if (typeof child != "string") dom.appendChild(child);
      else dom.appendChild(document.createTextNode(child));
    }
    return dom;
}


async function runApp(baseURL = theDomain + '/' + theBaseDirectory){
    // making first request to the server for the content of the first directory
    let responseAboutItems = await makeRequest(baseURL, 'GET');
    //console.log(responseAboutItems);

    let items = responseAboutItems.value.split('\n');
    let selectedItem = items[0];
    let responseAboutContent = selectedItem ? await makeRequest(baseURL + '/' + selectedItem, 'GET') : ''; 
    // it is an object, if selected option is a directory
    // or it's a string, if selected option is a file
    
    let state = {items, selectedItem, content : responseAboutContent, url: baseURL};
    let app = new FileApp(state, {controls : baseControls, dispatch});

    async function dispatch(action){
        state = await handleAction(state, action);
        //console.log("[dispatch] state:", state);
        app.syncState(state);
    }
    console.log(app);    
}
runApp()
