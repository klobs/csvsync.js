// many ideas taken from:
// http://www.html5rocks.com/en/tutorials/file/dndfiles/#toc-selecting-files-dnd and
// http://alexthorpe.com/uncategorized/learn-how-to-drag-drop-chart-a-file-using-html5/588/

function addException(machineName, day){
	var m = machines[machineName];
	exceptions[machineName] = { machineName: m.machineName,
								complianceStatus: m[day],
								validFrom: day,
								systems: systems,
								type: "exception"
								};

	updateDownloadButton(day);
	displayNotice(machineName, "an exception");
	disableOnGoingExceptionButton(machineName, day);
	$("#tr"+machineName+day).addClass("exception");
}

function addOnGoing(machineName, day){
	var m = machines[machineName];
	ongoing[machineName] = { machineName: m.machineName,
							 complianceStatus: m[day],
							 validFrom: day,
							 systems: systems,
							 type: "ongoing"
							};

	updateDownloadButton(day);
	displayNotice(machineName, "on-going");
	disableOnGoingExceptionButton(machineName, day);
	$("#tr"+machineName+day).addClass("ongoing");
}

// Only potentially incompliant systems pass by here.
function checkExceptionOrOnGoing(machine, day, systemName, exceptionsOrOnGoing){
	// Is there an exception at all?
	if(!(machine.machineName in exceptionsOrOnGoing))
		return "";

	var m = exceptionsOrOnGoing[machine.machineName];

	// If yes, could there be an exception for this system?
	if(!(m.systems.indexOf(systemName)))
		return "";

	// So last measurement, the system was ok, and now it is not???
	if(m.complianceStatus.systemName === true)
		return "";

	return m.type;
}

function checkIsNewOrOld(machine, day){
	var i = dates.indexOf(day);

	if (i === 0) 
		return " new ";
	else if (!(dates[i-1] in machine)) 
		return " new ";
	else return " old ";
}

function disableOnGoingExceptionButton(machineName, day){
	document.getElementById("btnExpt" + day + machineName).setAttribute("disabled", "disabled");
	document.getElementById("btnOnGoing" + day + machineName).setAttribute("disabled", "disabled");
}

function displayNotice(machineName, exceptionsOrOnGoingString){
	document.getElementById("notificationzone").innerHTML =
		'<div class="notice success fade"><i class="icon-ok icon-large"></i> Succsessfully added ' +
		machineName + ' as ' + exceptionsOrOnGoingString + ' <a href="#close" class="icon-remove"></a></div>';
}

function exceptionExportGenerator(){
	var c = { "exceptions":  exceptions, "ongoing": ongoing};
	return JSON.stringify(c);
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

function getMachine(machineName){
	var m = {machineName: machineName};
	if(machineName in machines){ m = machines[machineName]; }
	else { machines[machineName] = m; }
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

function incStatCounter(day,systemName){
	var d = {}
	if( day in statcounter ){
		d = statcounter[day];
	}

	if (systemName in d)
		d[systemName] = (d[systemName]) + 1;
	else d[systemName] = 1;

	statcounter[day] = d;
}

function getComplianceLevel(machine, day){
	var t = "";
	var inc = 0;

	for ( var i in systems){
		if((machine[day])[systems[i]] !== true){
			t = checkExceptionOrOnGoing(machine, day, systems[i], exceptions);
			t += checkExceptionOrOnGoing(machine, day, systems[i], ongoing);
			inc++;
		}
	}

	t += checkIsNewOrOld(machine, day);

	var cl = inc/systems.length;

	if (cl <= 1 && cl >= 0.75)
		t += " c000";
	else if (cl < 0.75 && cl >= 0.5)
		t += " c025";
	else if (cl < 0.5 && cl >= 0.25)
		t += " c050";
	else if (cl < 0.25 && cl > 0)
		t += " c075";
	else if (cl === 0)
		t += " c100";
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

	document.getElementById('filelist').innerHTML = '<h4>Following files have been analyzed</h4><ul>' +
		getFilenameLi() + '</ul>';
}

function processData(file) {

	// Split filename to optain meta information
	// files have to look like YYYYMMDD_<system>_extension.csv
	// One special case is the exception system
	var meta = file.name.split(/_|\./);

	// Did we already collect data about this day?
	var day = meta[0];
	updateDates(day);

	// What kind of system re we dealing with?
	var systemName = meta[1];

	if (systemName === "exceptions"){
		// is this a special, mighty, magical system?
		// let's trust it without input validation, which is always a good idea.
		// We can always (and will) add security, later.
		var e = JSON.parse(csv);
		exceptions = e.exceptions;
		ongoing = e.ongoing;
		renderTables(day);
		renderStats();
		return;
	}
	else if(systems.indexOf(systemName) === -1){
		// Remember which systems exists
		systems.push(systemName);
	}

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

		updateMachine(machine, day, systemName);
		incStatCounter(day, systemName);
	}
	renderTables(day);
	renderStats();
}

function renderStats( ){
	$("#stats").html("");
	
	for (d in dates){
		$("#stats").append('<h4>'+ formatDate(dates[d]) +'</h4>');
		$("#stats").append('<canvas id="statChart' + dates[d] + '" width="700" height="400"></canvas>');
		
		var data = { labels : systems.slice(0), datasets : [] }; // we want a clone of systems, not a reference
		var o  = {	animation : false, scaleOverride : true, scaleStartValue : 0, scaleStepWidth : 1, scaleSteps : ((Object.keys(machines)).length) };
	
		var ds = {  
			fillColor : "rgba(220,220,220,0.5)", 
			strokeColor : "rgba(220,220,220,1)", 
			data : []
		}; 

		for(s in systems){
			(ds["data"]).push((statcounter[(dates[d])])[systems[s]]);
		}	

		data["labels"].push("total");
		ds["data"].push((Object.keys(machines)).length);
		data["datasets"].push(ds);

		var ctx = $("#statChart" + dates[d]).get(0).getContext("2d");
		var myNewChart = new Chart(ctx).Bar(data, o);
	}
}

function renderTables( day ){

	tableDiv = "<h4>" + formatDate(day) +
		'</h4>\n<table class=""><thead><tr><th>Asset Name</th><th>Action</th>';

	for(var i = 0; i < systems.length; i++){
		tableDiv += "<th>" + systems[i] + "</th>";
	}

	tableDiv += "</tr></thead><tbody>";

	var ma = Object.keys(machines).sort();

	for(u in ma){
		m = ma[u];

		if(!(day in machines[m]))
			continue;

		var cl = getComplianceLevel(machines[m], day);

		var exceptionButton = /c100|exception|ongoing/.test(cl) ? "": '<button id="btnExpt' + day +
			m + '" class="green small" onclick="addException(\'' + m + '\', \'' +
					day + '\')"><i class="icon-ok"></i> Add Exception</button>';
		var onGoingButton = /c100|exception|ongoing/.test(cl) ? "": '<button id="btnOnGoing' + day +
			m + '" class="orange small" onclick="addOnGoing(\'' + m + '\', \'' +
					day + '\')"><i class="icon-cogs"></i> Add as OnGoing</button>';

		tableDiv += "<tr id='tr"+ m + day + "' class='"+ cl +"'><td>" + m + "</td>";
		tableDiv += "<td>";


		tableDiv = tableDiv	+ exceptionButton + onGoingButton + " </td>";
		for(var s = 0; s < systems.length; s++){
			var c =	((machines[m])[day])[systems[s]] ==
				true ? '<i class="icon-ok"></i>' : '<i class="icon-thumbs-down"/>';
			tableDiv += "<td><span class='tooltip' title='"+ systems[s]+"'>" + c + "</span></td>";
		}
		tableDiv += "</tr>\n";
	}

	tableDiv += "</tbody></table></div>";

	var di = document.createElement("div");
	di.setAttribute("class", "tab-content");
	di.setAttribute("id", "tab" + day);
	di.innerHTML = tableDiv;

	var destZone = document.getElementById("tab"+day);

	if(destZone === null)
		document.getElementById("tables").appendChild(di);
	else{
		destZone.innerHTML = tableDiv;
	}

	updateTabIndex();
	document.getElementById("i"+day).click();
}

function updateDates(day){
	if(dates.indexOf(day) === -1){
		dates.push(day);
		dates = dates.sort();
	}
}

function updateDownloadButton(day){
	document.getElementById("exceptions").setAttribute("style","display: block;");
	document.getElementById("exceptionsText").innerHTML =
		'<a href="data:text/csv;base64,' + btoa(exceptionExportGenerator()) +
		'" download="' + day + '_exceptions.csv"><i class="icon-download-alt"></i> Download Exception / OnGoing File</a>';
}

function updateMachine(machine, day, system){
	if(!(day in machine)){
		machine[day] = {};
	}
	(machine[day])[system] = true;
}

function updateTabIndex(){
	tl = ' <ul class="tabs left"> <li><a href="#intro">Intro</a></li> <li><a href="#filelist">Filelist</a></li><li><a href="#stats">Stats</a></li>';
	for(i in dates){
		tl += '<li><a id="i'+ dates[i] +'"href="#tab'+ dates[i] +'">' + formatDate(dates[i]) + '</a></li>';
	}
	tl += '</ul>';

	document.getElementById("tabitems").innerHTML = tl;

	// Following code is stolen from kickstart html document.ready
	// tab setup
	$('.tab-content').addClass('clearfix').not(':first').hide();
	$('ul.tabs').each(function(){
		var current = $(this).find('li.current');
		if(current.length < 1) { $(this).find('li:first').addClass('current'); }
		current = $(this).find('li.current a').attr('href');
		$(current).show();
	});

	// tab click
	$(document).on('click', 'ul.tabs a[href^="#"]', function(e){
		e.preventDefault();
		var tabs = $(this).parents('ul.tabs').find('li');
		var tab_next = $(this).attr('href');
		var tab_current = tabs.filter('.current').find('a').attr('href');
		$(tab_current).hide();
		tabs.removeClass('current');
		$(this).parent().addClass('current');
		$(tab_next).show();
		history.pushState( null, null, window.location.search + $(this).attr('href') );
		return false;
	});
}

// Setup the dnd listeners.
var csv, dates = [], filenames = [], systems = [], machines = {};
var ongoing = {}, exceptions = {}, statcounter = {};
var dropZone = document.getElementById('dropbox');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
