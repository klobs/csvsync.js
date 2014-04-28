// may ideas taken from:
// http://www.html5rocks.com/en/tutorials/file/dndfiles/#toc-selecting-files-dnd and
// http://alexthorpe.com/uncategorized/learn-how-to-drag-drop-chart-a-file-using-html5/588/

function getFilenameLi() {
	var l = "";
	for (i = 0; i < filenames.length; i++){
		l = l + "<li>" + filenames[i] + "</li>\n";
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

function getComplianceLevel(machine){
	var t = "unknonw";
	var inc = 0;

	for ( var i in systems){
		if(machine[systems[i]] !== true)
			inc++;
	}

	var cl = inc/systems.length;
	
	if(cl === 1)
		t = "c000";	
	else if (cl < 1 && cl >= 0.75)
		t = "c001";
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
	var day = {};

	if(meta[0] in dates){ day = dates[meta[0]]; }
	else { dates[meta[0]] = day; }

	// Seperate file by line breaks
	var allTextLines = csv.split(/\r\n|\n/);	

	// Prepare to filter comments
	var commentOrEmpty = /^#|^\s*$/;

	// loop through each line
	for (var i=0; i < allTextLines.length; i++){

		// Filter out comments
		if (commentOrEmpty.test(allTextLines[i]))
			continue;

		// Seperate line by comma
		var data = allTextLines[i].split(',');

		data[0] = data[0].toUpperCase();

		var asset = {};	

		// Do we already have information about that asset?
		if(data[0] in day){ asset = day[data[0]]; } 
		else { day[data[0]] = asset; }

		asset[system] = true;
	}
	renderTables(meta[0]);
}

function renderTables( date ){

	var tableZone = document.getElementById(date);
	var closeDiv  = false;
	
	var tableDiv = "";
	
	if (tableZone === null){
		tableZone = document.getElementById("tables");
		tableDiv = tableDiv + '<div id="' + date + '" class="tab-content">\n\t';
		closeDiv = true;
	}
	
	tableDiv = tableDiv + "<h2>" + formatDate(date) + '</h2>\n<table class="tight"><thead><tr><th>Asset Name</th>';

	for(var i = 0; i < systems.length; i++){
		tableDiv = tableDiv + "<th>" + systems[i] + "</th>";
	}

	tableDiv = tableDiv + "</tr></thead><tbody>";

	machines = Object.keys(dates[date]);

	for(var machine = 0; machine < machines.length; machine++){
		tableDiv = tableDiv + "<tr class="+ getComplianceLevel((dates[date])[machines[machine]]) +"><td>" + machines[machine] + "</td>"
			for(var s=0; s< systems.length; s++){
				var c =	((dates[date])[machines[machine]])[systems[s]] == true ? "ok" : "x"
				tableDiv = tableDiv + "<td>" + c + "</td>";
			}
		tableDiv = tableDiv + "</tr>\n";
	}

	tableDiv = tableDiv + "</tbody></table></div>";	

	if(closeDiv)
		tableDiv = tableDiv + "</div>";	

	tableZone.innerHTML = tableDiv;
}

// Setup the dnd listeners.
var csv, dates = {}, filenames = [], systems = [];
var dropZone = document.getElementById('dropbox');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
