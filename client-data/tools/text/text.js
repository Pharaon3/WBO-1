(function(){ //Code isolation

	var board = Tools.board;
	
	function clickHandler (x,y, evt) {
		//Let the user edit an existing textField
		if (evt.target && evt.target.className === "t_textField") return true;

		//If the user clicked where there was no text, then create a new text field
		Tools.drawAndSend({
			'type' : 'new',
			'id' : Tools.generateUID("t"), //"t" for text
			'color' : Tools.getColor(),
			'size' : Tools.getSize()+38,
			'x' : x,
			'y' : y
		});

		evt.preventDefault();
	}

	function textChangeHandler (evt) {
		var field = evt.target;
		if (performance.now() - field.dataset.lastSending > 100) {
			var innerText = getInnerText(field);
			if (field.dataset.sentText !== innerText) {
				Tools.send({
					'type' : "update",
					'field' : field.id,
					'txt' : getInnerText(field)
				});
				field.dataset.sentText = innerText;
				field.dataset.lastSending = performance.now();
			}
		} else {
			clearTimeout(field.dataset.timeout);
			field.dataset.timeout = setTimeout(textChangeHandler, 200, evt);
		}
	}
	
	function fieldBlurHandler (evt) {
		var field = evt.target;
		console.log("blur", field);
		if (field.textContent.trim() === "") {
			Tools.drawAndSend({
				"type" : "delete",
				"field" : field.id
			});
		}
	}

	function draw(data, isLocal) {
		switch(data.type) {
			case "new":
				var newField = createTextField(data);
				if (isLocal) {
					newField.focus();
				}
				break;
			case "update":
				var textField = document.getElementById(data.field);
				if (textField===null) {
					console.log("Text: Hmmm... I received text that belongs to an unknown text field");
					return false;
				}
				updateText(textField, data.txt);
				break;
			case "delete":
				var textField = document.getElementById(data.field);
				if (textField===null) {
					console.log("Text: Hmmm... I'm trying to delete an unknown text field");
					return false;
				}
				Tools.drawingArea.removeChild(textField);
				break;
			default:
				console.log("Text: Draw instruction with unknown type. ", data);
				break;
		}
	}

	function getInnerText(field) {
		/*Firefox doesn't have node.innerText,
		but it's needed in order to have get the new line characters*/
		if (field.innerText) return field.innerText;
		var text = "";
		var nodes = field.childNodes;
		for (var i=0; i<nodes.length; i++) {
			var node = nodes[i];
			if (node.nodeName === "BR") {
				text += "\n";
			} else {
				text += node.textContent;
			}
		}
		return text;
	}

	function updateText (textField, text) {
		textField.textContent = text;
	}

	function createTextField (fieldData) {
	    var fo = Tools.createSVGElement("foreignObject");
	    fo.id = fieldData.id;
fo.setAttribute("class", "MathElement");
		fo.setAttribute("x", fieldData.x);
		fo.setAttribute("y", fieldData.y);
fo.setAttribute("width", "300");
fo.setAttribute("height", "100");

	    
		var elem = document.createElement("div");
		
		elem.style.color = fieldData.color;
		elem.style.fontSize = fieldData.size+"px";
		elem.className = "t_textField";
		elem.contentEditable="true";
		Tools.positionElement(elem, fieldData.x, fieldData.y);
		elem.addEventListener("keyup", textChangeHandler);
		elem.addEventListener("change", textChangeHandler);
		
		elem.dataset.lastSending = performance.now();
		
		fo.appendChild(elem);
		
		Tools.drawingArea.appendChild(fo);
		return fo;
	}

	Tools.add({ //The new tool
	 	"name" : "Text",
	 	"listeners" : {
	 		"press" : clickHandler,
	 	},
	 	"draw" : draw,
	});

})(); //End of code isolation
