// many ideas taken from:
// http://www.html5rocks.com/en/tutorials/file/dndfiles/#toc-selecting-files-dnd and
// http://alexthorpe.com/uncategorized/learn-how-to-drag-drop-chart-a-file-using-html5/588/

function addException(machineName, day){
	var m = machines[machineName];
	exceptions[machineName] = { machine: m[day], exceptionDate: day};

	document.getElementById("exceptions").setAttribute("style","display: inline;");

	document.getElementById("notificationzone").innerHTML = 
		'<div class="notice success"><i class="icon-ok icon-large"></i> Succsessfully added ' + 
		machineName + ' as an exception <a href="#close" class="icon-remove"></a></div>';

	document.getElementById("exceptionsText").innerHTML = 
			'<a href="data:text/csv;base64,' + btoa(exceptionExportGenerator()) + 
			'" download="' + day + '_exceptions.csv"><i class="icon-download-alt"></i> Download Exception / OnGoing File</a>';
	disableOnGoingExceptionButton(machineName, day);
}	

function addOnGoing(machineName, day){
	var m = machines[machineName];
	onGoing[machineName] = { machine: m[day], onGoingDate: day};

	document.getElementById("exceptions").setAttribute("style","display: inline;");

	document.getElementById("notificationzone").innerHTML = 
		'<div class="notice success"><i class="icon-ok icon-large"></i> Succsessfully added ' + 
		machineName + ' as OnGoing <a href="#close" class="icon-remove"></a></div>';

	document.getElementById("exceptionsText").innerHTML = 
			'<a href="data:text/csv;base64,' + btoa(exceptionExportGenerator()) + 
			'" download="' + day + '_exceptions.csv"><i class="icon-download-alt"></i> Download Exception / OnGoing File</a>';
	disableOnGoingExceptionButton(machineName, day);
}	

function disableOnGoingExceptionButton(machineName, day){
	document.getElementById("btnExpt" + day + machineName).setAttribute("class", "disabled small");
	document.getElementById("btnExpt" + day + machineName).setAttribute("onclick", "");
	document.getElementById("btnOnGoing" + day + machineName).setAttribute("class", "disabled small");
	document.getElementById("btnOnGoing" + day + machineName).setAttribute("onclick", "");
}

function exceptionExportGenerator(){
	c = "#HOSTNAME,Date of incompliance acceptance,list|of|incompliances|accepted,ongoin|excepted\n";
	for (e in exceptions){
		c += e + "," + (exceptions[e])["exceptionDate"] + ",";
		for(s in (exceptions[e])["machine"]){
			c+= s + "|";
		}
		c += ",exception\n";
	}

	for (e in onGoing){
		c += e + "," + (onGoing[e])["onGoingDate"] + ",";
		for(s in (onGoing[e])["machine"]){
			c+= s + "|";
		}
		c += ",ongoing\n";
	}
	return c;
}

function getFilenameLi() {
	var l = "";
	for (i = 0; i < filenames.length; i++){
		l += "<li>" + filenames[i] + "</li>\n";
	}
	return l;
}

function formatDate(date){
	date = date.split("");
	return  date[0] + 
			date[1] + 
			date[2] + 
			date[3] + "-" + 
			date[4] +
			date[5] + "-" +
			date[6] +
			date[7];
}

function getMachine(machine){
	var m = {};
	if(machine in machines){ m = machines[machine]; }
	else { machines[machine] = m; }
	return m;
}

function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files; // FileList object.
	parse(files);
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function getComplianceLevel(machine, day){
	var t = "unknonw";
	var inc = 0;

	for ( var i in systems){
		if((machine[day])[systems[i]] !== true)
			inc++;
	}

	var cl = inc/systems.length;
	
	if (cl <= 1 && cl >= 0.75)
		t = "c000";
	else if (cl < 0.75 && cl >= 0.5)
		t = "c025";
	else if (cl < 0.5 && cl >= 0.25)
		t = "c050";
	else if (cl < 0.25 && cl > 0)
		t = "c075";
	else if (cl === 0)
		t = "c100";
	return t;
}

function parse(files) {
	for (var i = 0, f; f = files[i]; i++) {

		// Dont process a file twice
		if( filenames.indexOf(f.name) !== -1)
			continue;

		filenames.push(f.name);

		var reader = new FileReader();

		// begin the read operation
		reader.readAsText(f, "UTF-8");

		// init the reader event handlers
		reader.onload = ( function(theFile) {
			return function(e) {
				// Set csv variable equal to file contents
				csv = e.target.result;

				// Run CSV parsing function
				processData(theFile);
			};
		})(f);
	}

	document.getElementById('filelist').innerHTML = '<ul>' + getFilenameLi() + '</ul>';
}

function processData(file) {

	// Split filename to optain meta information
	// files have to look like YYYYMMDD_<system>_extension.csv
	// One special case is the exception system
	var meta = file.name.split(/_|\./);

	var system = meta[1];

	// Remember which systems exists
	if(systems.indexOf(system) === -1){
		systems.push(system);
	}

	// See wheather there is already data for this day
	var day = meta[0];

	// Did we already collect data about this day?
	updateDates(day);

	// Seperate file by line breaks
	var allTextLines = csv.split(/\r\n|\n/);	

	// Prepare to filter comments
	var commentOrEmpty = /^#|^\s*$/;

	// loop through each line
	for (var i=0; i < allTextLines.length; i++){

		// Filter out comments
		if (commentOrEmpty.test(allTextLines[i]))
			continue;

		// Seperate line by comma or semicolon
		var data = allTextLines[i].split(/,|;/);

		data[0] = data[0].toUpperCase();

		var machine = getMachine(data[0]);

		updateMachine(machine, day, system);
	}
	renderTables(day);
}

function renderTables( day ){

	var tableZone = document.getElementById(day);
	var closeDiv  = false;
	
	var tableDiv = "";
	
	if (tableZone === null){
		tableZone = document.getElementById("tables");
		tableDiv += '<div id="' + day + '" class="">\n\t';
		closeDiv = true;
	}
	
	tableDiv += "<h2>" + formatDate(day) + 
		'</h2>\n<table class=""><thead><tr><th>Asset Name</th><th>Action</th>';

	for(var i = 0; i < systems.length; i++){
		tableDiv += "<th>" + systems[i] + "</th>";
	}

	tableDiv += "</tr></thead><tbody>";

	for(m in machines){
		if(!(day in machines[m]))
			continue;

		var cl = getComplianceLevel(machines[m], day);

		var exceptionButton = cl === "c100" ? "": '<button id="btnExpt' + day + 
			m + '" class="green small" onclick="addException(\'' + m + '\', \'' + 
					day + '\')"><i class="icon-ok"></i> Add Exception</button>'; 
		var onGoingButton = cl === "c100" ? "": '<button id="btnOnGoing' + day + 
			m + '" class="orange small" onclick="addOnGoing(\'' + m + '\', \'' + 
					day + '\')"><i class="icon-cogs"></i> Add as OnGoing</button>'; 

		tableDiv += "<tr class="+ cl +"><td>" + m + "</td>";
		tableDiv += "<td>"; 
	

		tableDiv = tableDiv	+ exceptionButton + onGoingButton + " </td>";
		for(var s = 0; s < systems.length; s++){
			var c =	((machines[m])[day])[systems[s]] == 
				true ? '<i class="icon-ok"></i>' : '<i class="icon-thumbs-down"/>';
			tableDiv += "<td>" + c + "</td>";
		}
		tableDiv += "</tr>\n";
	}

	tableDiv += "</tbody></table></div>";	

	if(closeDiv)
		tableDiv += "</div>";	

	tableZone.innerHTML = tableDiv;
}

function updateDates(day){
	if(dates.indexOf(day) === -1){
		dates.push(day);
		dates = dates.sort();
	}
}

function updateMachine(machine, day, system){
	if(!(day in machine)){
		machine[day] = {};
	}
	(machine[day])[system] = true;
}

// Setup the dnd listeners.
var csv, dates = [], filenames = [], systems = [], machines = {};
var onGoing = {}, exceptions = {};
var dropZone = document.getElementById('dropbox');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
