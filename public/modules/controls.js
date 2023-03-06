import { folderIcon, fileIcon, emptyIconUrl } from "../script.js";
//-----------------------------------------------------------------
//                  Button Handlers
//-----------------------------------------------------------------

function elt(type, props, ...children) {
    let dom = document.createElement(type);
    if (props) Object.assign(dom, props);
    for (let child of children) {
      if (typeof child != "string") dom.appendChild(child);
      else dom.appendChild(document.createTextNode(child));
    }
    return dom;
}
/*
function parseContentType(content){
    if(content.type == 'directory'){
        return 'directory'
    } else{
        return 'file'
    }
}
*/
function renderOption(optionName){
    return elt('option', {value : optionName}, document.createTextNode(optionName));
}

export class ItemSelect {
    constructor(state, dispatch) {
        this.select = elt("select", 
        {
            id: 'directories',
            onchange: () => dispatch({type: "setSelectedOption", selectedItem: this.select.value})
        }, 
        ...state.items.map(name => elt("option", 
                                           {selected: name == state.selectedItem, value: name},
                                           name)));
        this.icon = elt("div", {id: 'itemIcon'});
        this.dom = elt("label", {className: "selectContainer"}, this.icon, this.select);
    }
    syncState(state){ 
        // we are replacing options in the select
        this.select.replaceChildren(
            ...state.items.map(opt => renderOption(opt))
        );
        // we set the selected option to the select
        this.select.value = state.selectedItem;

        switch(state.items.length && state.content.type){
            case 0:
                let img = document.createElement('img');
                img.src = emptyIconUrl;
                img.alt = ''
                img.id = 'emptyIcon';
                this.icon.innerHTML = '';
                this.icon.appendChild(img);
                break;   
            case 'directory': 
                itemIcon.innerHTML = folderIcon;
                break;
            case 'file': 
                itemIcon.innerHTML = fileIcon;
                break;
        }
    }
}

export class Open{
    constructor(state, dispatch){
        // the state here is the state that was created at the creation of the FileApp
        // and it DOES NOT update after that moment!
        this.handleOpenDirectory = function (e){
            e.preventDefault();
            dispatch({type: "open"})
        }
        this.dom = elt('button', 
                       {
                            id : 'open', 
                            disabled : false,
                            //onclick : this.handleOpenDirectory,
                        },
                       'Open');
    }
    syncState(state){
        ///*
        switch(state.content.type){
            case 'directory': 
                this.dom.addEventListener("click", this.handleOpenDirectory)
                this.dom.disabled = false;
                break;
            default:
                this.dom.removeEventListener("click",  this.handleOpenDirectory)
                this.dom.disabled = true;
                break;
        }
        //*/
    }
}

export class Back{
    constructor(state, dispatch){
        // the state here is the state that was created at the creation of the FileApp
        // and it DOES NOT update after that moment!
        this.dom = elt('button', 
                       {
                            id : 'back', 
                            disabled : false,
                            onclick : (e) => {
                                e.preventDefault();
                                dispatch({type: "back"});
                            }
                        },
                       'Back');
    }
    syncState(state){
        if(state.url.split('/').length > 4){
            this.dom.disabled = false;
        } else{
            this.dom.disabled = true;
        }
    }
}

export class Save{
    constructor(state, dispatch){
        this.dom = elt('button', 
        {
             id : 'save', 
             onclick : (e) => {
                e.preventDefault()
                dispatch({type: "save"})
            }
         },
        'Save');
    }
    syncState(state){
        switch(state.items.length && state.content.type){
            case 'file': 
                this.dom.disabled = false;
                break;
            default: 
                this.dom.disabled = true;
                break;
        }
    }
}

export class CreateFile{
    constructor(state, dispatch){
        this.dom = elt('button', 
        {
             id : 'createFile', 
             onclick : (e) => {
                e.preventDefault()
                dispatch({type: "createFile"})
            }
         },
        'Create File');
    }
    syncState(state){}
}

export class CreateDirectory{
    constructor(state, dispatch){
        this.dom = elt('button', 
        {
             id : 'createDirectory', 
             onclick : (e) => {
                e.preventDefault()
                dispatch({type: "createDirectory"})
            }
         },
        'Create Directory');
    }
    syncState(state){}
}

export class Delete{
    constructor(state, dispatch){
        this.dom = elt('button', 
        {
             id : 'delete', 
             onclick : (e) => {
                e.preventDefault()
                dispatch({type: "delete"})
            }
         },
        'Delete');
    }
    syncState(state){
        if(state.items.length){
            this.dom.disabled = false;
        } else{
            this.dom.disabled = true;
        }
    }
}
