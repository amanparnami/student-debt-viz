/* TODO 
	* Draw a stack bar chart
	** draw x and y axis (done)
	** read data and handle null values (done)
	*** 74 schools with no aid data (done)
	**** remove them: 992 rows remain (done)
	*** Some schools with parts of data missing 
	**** wherever there is a null preceded by zero then insert zero
	* Make it interactive
	* handle the 74 schools that were removed earlier
	* brushing (done)
	* sorting (done. first attempt)
	* filtering
	** changing the opacity of the filtered out elements
	** cascade to detailed view
	** do filters OR or AND
	* details on demand
	** add a click event trigger and pull "d" from there (done)
	** modify showDetailsOnClick(d) to parse the strings
	*** give proper names to labels. For example, average_amount_any_personal_contribution -> Personal Contribution
	*** add units to values and round off decimal values. For example, $ to monetary
	*** the bar that is selected should be highlighted unless anything else is clicked
	* show labels
	** in case of states show state names
	* when brushed highlight the states
	* 5 levels of intensity for states, where each level corresponds to number of case (0-5, 5-10,...)
	* display count of cases selected/filtered
	* show details on demand for atleast one value by default

	
	Known Bugs
	* in case of twodown and heighest data values, bottom bars get cut (done)
	* on refreshing the page the map resets only half the time (done)
	* on sorting the filter becomes ineffective but the selection of filter remains intact (done)
	* on filtering and sorting the brush resets
	* Puerto Rico is missing from the map but there are cases for that.
	* Jitter in the values on sorting.
	
*/
	
		$(document).ready(function() {
			
			
			
			var cmargin = {top: 20, right: 10, bottom: 20, left: 40},
			fmargin = {top: 20, right: 10, bottom: 220, left: 40},
			cwidth = 1060 - cmargin.left - cmargin.right, //width=# of rows in csv
			fwidth = 343 - fmargin.left - fmargin.right,
			cheight = 200 - cmargin.top - cmargin.bottom,
			fheight = 453 - fmargin.top - fmargin.bottom;
	
			var cx = d3.scale.ordinal().rangeRoundBands([0, cwidth], .1),
			fx = d3.scale.ordinal().rangeRoundBands([0, fwidth], .1),
			cy = d3.scale.linear().range([cheight, 0]).nice(),
			fy = d3.scale.linear().range([fheight, 0]);
			
			var cxAxis = d3.svg.axis()
			.scale(cx)
			.orient("bottom")
			.tickFormat(function(d){return "";});
		
			var fxAxis = d3.svg.axis()
			.scale(fx)
			.orient("bottom")
			.tickFormat(function(d){return "";});

			var cyAxis = d3.svg.axis()
			.scale(cy)
			.orient("left")
			.tickFormat(function(d) { return Math.round(d / 1e3) + "K"; })
			.ticks(7);
									
			var fyAxis = d3.svg.axis()
			.scale(fy)
			.orient("left")
			.tickFormat(function(d) { return Math.round(d / 1e3) + "K"; });
	
			// An SVG element with a top-left origin .
			// var svg = d3.select("body").append("svg")
			// .attr("width", cwidth + cmargin.left + cmargin.right)
			// .attr("height",fheight + fmargin.top + fmargin.bottom+100)
	
			var context = d3.select("div.context").append("svg")
			.attr("id", "context-svg")
			.attr("width", cwidth + cmargin.left + cmargin.right)
			.attr("height",cheight + cmargin.top + cmargin.bottom).append("g")
			.attr("id", "context")
			.attr("transform", "translate(" + cmargin.left + "," + cmargin.top + ")");
				
			var focus = d3.select("div.focus").append("svg")
			.attr("width", fwidth + fmargin.left + fmargin.right)
			.attr("height",fheight + fmargin.top + fmargin.bottom).append("g")
			.attr("id","focus")
			.attr("transform", "translate(" + fmargin.left + "," + fmargin.top + ")");
	
			var legend = d3.select("div#legend").append("svg").attr("height",60);
	
			var color = d3.scale.ordinal()
			.range(["E6550D", "FDAE6B", "FEE6CE"]);//["#1f77b4","#ff7f0e","#2ca02c"]);
			
			//Filter UI variables
			var debtRange =[];
			var coaRange = [];
			
			//Filter logic variables
			var controlFilter = "";
			var urbanFilter = "";
			var sizeFilter = [];
			var stateFilter = "";
			var debtFilter = [];
			var coaFilter = [];
			var searchFilter = "";
			
			var filteredIDs = [];
			
			var lastActionSort = false;
			
			//Focus modes
			var ALLUP = 0;
			var ONEDOWN = 1;
			var TWODOWN = 2;
			
			var isStateSelected = false;
			var selectedState = "";
			
			//Sort types
			var STATE = 0;
			var SIZE = 1
			var DEBT = 2;
			var GRANT = 3;
			var COA = 4;
			
			var HEADER_NAME_MAP = {"average_amount_any_loan_aid":"Avg. Loan", 
														"average_amount_personal_contribution":"Avg. Personal Contribution", 
														"average_amount_any_grant_aid": "Avg. Grant",
														"average_coa": "Avg. COA",
														"control": "Control Type",
														"degree_urbanization": "Degree Urbanization",
														"size_category": "Size",
														"debt" : "Avg. Debt",
														"state" : "State"};
													var trueValues = ["n/a", "Under 1,000", "1,000 - 4,999", "5,000 - 9,999", "10,000 - 19,999", "20,000 & above"];
			var SIZE_CATEGORY_MAP = {"n/a": "Not reported",
																"Under 1,000" : "Under 1-000",
																"1,000 - 4,999" : "1-000 - 4-999",
																"5,000 - 9,999" : "5-000 - 9-999",
																"10,000 - 19,999" : "10-000 - 19-999",
																"20,000 & above" : "20-000 and above"
															}; 
															var SIZE_CATEGORY_ARR = ["Not reported",
																												"Under 1-000",
																												"1-000 - 4-999",
																												"5-000 - 9-999",
																												"10-000 - 19-999",
																												"20-000 and above"
																												];
			
			var focusMode = TWODOWN;
			var sortType = COA;
			
			var cData = [], fData = [], filteredData = [];
			
			var width = 702,
			    height = 499;
			
			var projection = d3.geo.albersUsa()
			    .scale(width)
			    .translate([width / 2, height / 2]);

			var path = d3.geo.path()
			    .projection(projection);
			
			var states = d3.select("div.states").append("svg")
			.attr("width", width)
			.attr("height",height)
			.append("g")
			.attr("id", "states");

			d3.json("assets/us-states.json", function(error, json) {
								  states.selectAll("path")
								      .data(json.features)
								    .enter().append("path")
								      .attr("d", path)
											.attr("data-state", function(d) {return d.properties.name;})
											.on("click", onStateClick)
											.append("title").text(function(d) {return d.properties.name;});
											
								});
			
			function onStateClick(d) {
				var stateName = d.properties.name;
				
				if(!isStateSelected) {
					//No state is selected
					d3.select(this).style("fill", "#E6550D");
					selectedState = stateName;
					isStateSelected = true;
					
					stateFilter = d.properties.name;
					
					//This is to ensure that the search and filters do not conflict
					if($(".remove").is(":visible")) {
						$(".remove").trigger("click");
					}
					drawContext(cData);
				} else {
					//If a state is selected already
					//check if the same state is clicked again
					if(selectedState == stateName){
						//Toggle
						$('.states path[data-state="'+selectedState+'"]').css("fill", "");
						isStateSelected = false;
						selectedState = "";
						stateFilter = "All"; 
						drawContext(cData);
					} else {
						//A new state is selected
						$('.states path[data-state="'+selectedState+'"]').css("fill", "");
						d3.select(this).style("fill", "#E6550D");
						selectedState = stateName;
						isStateSelected = true;
					
						stateFilter = d.properties.name;
						drawContext(cData);
					}
				}
			}
			
			function highlightCasesOnStateHover(d) {
				stateFilter = d.properties.name;
				drawContext(cData);
			}
			
			function highlightStates (fData) {
				//Reset color for all states
				states.selectAll("path").style("fill", "#aaa").style("fill-opacity",1);
				var stateCount = [];
				
				$.each(fData, function(key, value){
					//Initialize else NaN appears
					if(stateCount[value.state] == null) {
						stateCount[value.state] = 0;
					}
					//Increment the count
					stateCount[value.state] += 1 ;
				});
				
				$.each(fData, function(key, value){
					$('.states path[data-state="'+value.state+'"]').css("fill", "red").css("fill-opacity", 0.2*(Math.ceil(stateCount[value.state]/5)));
				});
				
				
				//pick the states
			}
			
			d3.csv("data/source_data.csv", function(error,csvData) {
				color.domain(["average_amount_any_loan_aid", "average_amount_personal_contribution", "average_amount_any_grant_aid"]);
				
				// Convert strings to numbers.
				csvData.forEach(function(d, i) {
					if(d.average_amount_any_loan_aid == "") {
						d.average_amount_any_loan_aid = +0;
					}
					d.average_amount_any_loan_aid = Math.floor(+d.average_amount_any_loan_aid);
					if(d.average_amount_any_grant_aid == "") {
						d.average_amount_any_grant_aid = +0;
					}
					d.average_amount_any_grant_aid = Math.floor(+d.average_amount_any_grant_aid);
					if(d.average_amount_personal_contribution == "") {
						d.average_amount_personal_contribution = +0;
					}
					d.average_amount_personal_contribution = Math.floor(+d.average_amount_personal_contribution);
					
					/*
					** Since our calculated average_amount_personal_contribution could be negative we have to make adjustments.
					** - If it is negative subtract the extra amount from loan aid (assuming a smart person would do that)
					** - Make the personal contribution = 0
					*/
					if(d.average_amount_personal_contribution < 0) {
						d.average_amount_any_loan_aid -= d.average_amount_personal_contribution;
						d.average_amount_personal_contribution = 0;
					}
					
					var y0 = 0;
					d.amounts = color.domain().map(function(name) { return {name: name, y0: y0, y1: y0 += +d[name]}});
					d.total = d.amounts[d.amounts.length - 1].y1;
					d.debt = d.average_amount_any_loan_aid + d.average_amount_personal_contribution;
				});
								
				debtRange = d3.extent(csvData, function(d) { return d.debt;});	
				coaRange = d3.extent(csvData, function(d) { return d.total;});
				cData = csvData;
				// Initializing the filters
				controlFilter = "All";
				sizeFilter = [0,5];
				urbanFilter = "All";
				stateFilter = "All";
				debtFilter[0] = debtRange[0];
				debtFilter[1] = debtRange[1];
				coaFilter[0] = coaRange[0];
				coaFilter[1] = coaRange[1];
				
				//This piece of code to setup sliders occurs here in order force it to use values of debtRange
				//and coaRange
				$( "#debt-range-slider" ).slider({
				            range: true,
				            min: debtRange[0],
				            max: debtRange[1],
				            values: [debtRange[0], debtRange[1]],
				            slide: function( event, ui ) {
				                $( "#debt-range" ).text( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
												// var filtered = context.selectAll(".context-bar").filter(function(d, i) {
												// 	return (d["debt"] > ui.values[ 0 ] && d["debt"] < ui.values[ 1 ]); });

													
				            },
										change: function(event, ui) {
											if(debtFilter[0] != ui.values[ 0 ] || debtFilter[1] != ui.values[ 1 ]){
												debtFilter[0] = ui.values[ 0 ];
												debtFilter[1] = ui.values[ 1 ];
												drawContext(cData);
												if($(".remove").is(":visible")) {
													$(".remove").trigger("click");
												}
											}
										}
				        });
				        $( "#debt-range" ).text( "$" + $( "#debt-range-slider" ).slider( "values", 0 ) +
				            " - $" + $( "#debt-range-slider" ).slider( "values", 1 ) );
				
				
				$( "#coa-range-slider" ).slider({
				            range: true,
				            min: coaRange[0],
				            max: coaRange[1],
				            values: [coaRange[0],coaRange[1]],
				            slide: function( event, ui ) {
				                $( "#coa-range" ).text( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
												// var filtered = context.selectAll(".context-bar").filter(function(d, i) {
												// 													return (d["total"] > ui.values[ 0 ] && d["total"] < ui.values[ 1 ]); });
												
				            },
										change: function(event, ui) {
											if(coaFilter[0] != ui.values[0] || coaFilter[1] != ui.values[1]) {
											coaFilter[0] = ui.values[ 0 ];
											coaFilter[1] = ui.values[ 1 ];
											drawContext(cData);
											if($(".remove").is(":visible")) {
												$(".remove").trigger("click");
											}
										}
											
										}
				        });
				        $( "#coa-range" ).text( "$" + $( "#coa-range-slider" ).slider( "values", 0 ) +
				            " - $" + $( "#coa-range-slider" ).slider( "values", 1 ) );
										
								    var trueValues = ["n/a", "Under 1,000", "1,000 - 4,999", "5,000 - 9,999", "10,000 - 19,999", "20,000 & above"];
								    var values =     [0,   1,   2,    3,    4,    5];
								    var slider = $("#size-range-slider").slider({
								        range: true,
								        min: 0,
								        max: 5,
								        values: [0, 5],
								        slide: function(event, ui) {
								            var includeLeft = event.keyCode != $.ui.keyCode.RIGHT;
								           								            								            var includeRight = event.keyCode != $.ui.keyCode.LEFT;
								           								            								            var value = findNearest(includeLeft, includeRight, ui.value);
								           								            								            if (ui.value == ui.values[0]) {
								           								            								                slider.slider('values', 0, value);
								           								            								            }
								           								            								            else {
								           								            								                slider.slider('values', 1, value);
								           								            								            }
														
														
														
								            $("#size-range").text(getRealValue(slider.slider('values', 0)) + ' - ' + getRealValue(slider.slider('values', 1)));
								            
								        },
								        change: function(event, ui) { 
													//Since change is called even on clicking a handle when no value has changed
													// I will check if a value has changed
													if(sizeFilter[0] != ui.values[0] || sizeFilter[1] != ui.values[1]) {
														sizeFilter[0] = ui.values[0];
														sizeFilter[1] = ui.values[1];
									            drawContext(cData);
															if($(".remove").is(":visible")) {
																$(".remove").trigger("click");
															}
													}
								        }
								    });
										$("#size-range").text(getRealValue(slider.slider('values', 0)) + ' - ' + getRealValue(slider.slider('values', 1)));
								    function findNearest(includeLeft, includeRight, value) {
								        var nearest = null;
								        var diff = null;
								        for (var i = 0; i < values.length; i++) {
								            if ((includeLeft && values[i] <= value) || (includeRight && values[i] >= value)) {
								                var newDiff = Math.abs(value - values[i]);
								                if (diff == null || newDiff < diff) {
								                    nearest = values[i];
								                    diff = newDiff;
								                }
								            }
								        }
								        return nearest;
								    }
								    function getRealValue(sliderValue) {
								        for (var i = 0; i < values.length; i++) {
								            if (values[i] >= sliderValue) {
								                return trueValues[i];
								            }
								        }
								        return 0;
								    }
										
											
										var autoCompleteData = new Array();
												var k = 0;
												
												$.each(cData, function(key, value) {
													autoCompleteData.push({"label": value.name, "value": value.state, "d":value});
												});
										
								        $( "#search-box" ).autocomplete({
								            minLength: 0,
								            source: autoCompleteData,
								            focus: function( event, ui ) {
								                $( "#search-box" ).val( ui.item.label );
								                return false;
								            },
								            select: function( event, ui ) {
								                $( "#search-box" ).val( "");
								                //$( "#search-value" ).val( ui.item.id );
																/*When a school is selected reset all the other filters */
																var school = ui.item.label,  
										                span = $("#saved-search-value").text(school).show(),  
										                a = $("<a>").addClass("remove").attr({  
																                    href: "javascript:",  
																                    title: "Remove " + school  
																                }).text("x").appendTo(span);  
																                
																
																controlFilter = "All";
																$("#all-filter").attr("checked","checked").button("refresh");
																
																sizeFilter = [0,5];
																$("#size-range-slider").slider("values",[0,5]);
																$("#size-range").text(getRealValue(0) + ' - ' + getRealValue(5));
																
																urbanFilter = "All";
																$("#all-urban-filter").attr("checked","checked").button("refresh");
																
																stateFilter = "All";
																debtFilter[0] = debtRange[0];
																debtFilter[1] = debtRange[1];
																
																$("#debt-range-slider").slider("values", [debtRange[0], debtRange[1]]);
																
												        $( "#debt-range" ).text( "$" + debtRange[0] + " - $" + debtRange[1]);
																		
																coaFilter[0] = coaRange[0];
																coaFilter[1] = coaRange[1];
																$("#coa-range-slider").slider("values", coaRange);
												        $( "#coa-range" ).text( "$" + $( "#coa-range-slider" ).slider( "values", 0 ) +
												            " - $" + $( "#coa-range-slider" ).slider( "values", 1 ) );
																		
																$('.states path[data-state="'+selectedState+'"]').css("fill", "");
																isStateSelected = false;
																selectedState = "";
																stateFilter = "All"; 
																// $('.filter input[name="control-filter"]').each(function(i) {$(this).button("disable");});
																// 																$("#size-range-slider").slider("disable");
																// 																$('.filter input[name="urban-filter"]').each(function(i) {$(this).button("disable");});
																// 																$("#debt-range-slider").slider("disable");
																// 																$("#coa-range-slider").slider("disable");
																showDetailsOnClick(ui.item.d);
																searchFilter = ui.item.label;
															 	drawContext(cData);
															 
								                return false;
								            }
								        }).data( "autocomplete" )._renderItem = function( ul, item ) {
								            return $( "<li>" )
								                .data( "item.autocomplete", item )
								                .append( "<a>" + item.label + "</a>" )
								                .appendTo( ul );
								        };
												
												//add click handler to friends div
												$("#search").click(function(){
													//focus 'to' field
													$("#search-box").focus();
												});
												//add live handler for clicks on remove links
												$(".remove", document.getElementById("search")).live("click", function(){
													//remove current friend
													//$(this).parent().remove();
													$(this).parent().hide();
													//reset the filter
													searchFilter = "";
													//remove details on demand
													hideDetailsOnDemand();
													
													//enable filters
													// $('.filter input[name="control-filter"]').each(function(i) {$(this).button("enable");});
													// 													$('.filter input[name="urban-filter"]').each(function(i) {$(this).button("enable");});
													// 													$("#size-range-slider").slider("enable");
													// 													$("#debt-range-slider").slider("enable");
													// 													$("#coa-range-slider").slider("enable");
													drawContext(cData);
													//correct 'to' field position
													if($("#search span").length === 0) {
														$("#search-box").css("top", 0);
													}
												});
												
				csvData = sortData(csvData, sortType);
				
				//cx.domain(csvData.map(function(d) { return d.id; }));
				
				//fx.domain(cx.domain());
				
												
				drawContext(csvData);
				
				//Initialize focus with 20 values
				
			
			});//d3.csv
	
			
	
			function sortData(csvData, sortBy) {
				switch(sortBy) {
					case STATE:
					return csvData.sort(function(a,b) {return (a.state==b.state)? 0 : ((a.state<b.state)? -1:1);});
					break;
					case SIZE:
					return csvData.sort(function(a,b) {return (a.size==b.size)? 0 : ((a.size<b.size)? -1:1);});
					break;
					case DEBT:
					return csvData.sort(function(a,b) {return (a.debt==b.debt)? 0 : ((a.debt<b.debt)? -1:1);});
					break;
					case GRANT:
					return csvData.sort(function(a,b) {return (a.average_amount_any_grant_aid==b.average_amount_any_grant_aid)? 0 : ((a.average_amount_any_grant_aid<b.average_amount_any_grant_aid)? -1:1);});
					break;
					case COA:
					return csvData.sort(function(a,b) {return (a.total==b.total)? 0 : ((a.total<b.total)? -1:1);});
					break;
				}
			}
			
			function showDetailsOnClick(d) {
					
					var coa = Math.round(d.average_coa);
					var details_svg = d3.select("div.details").selectAll("svg");
					var details_div = $(".details-on-demand");
					
					$("#default-dod-msg").hide();
					//clear last record  (remove elements)
					details_svg.remove();		
					details_div.contents().remove();			
														
					// add text fields
					details_div.append("<h3><strong>"+d.name+"</strong><h3>");			
					details_div.append("State: <strong>"+d.state+"</strong><br/>");			
					details_div.append("Size: <strong>"+d.size_category+"</strong><br/>");			
					details_div.append("Type: <strong>"+d.control+"</strong><br/>");			
					details_div.append("Urban: <strong>"+d.degree_urbanization+"</strong><br/>");
					details_div.append("Avg COA: <strong>$"+coa+"</strong><br/>");
					details_div.append("Avg Debt: <strong>$"+(d.average_amount_any_loan_aid + d.average_amount_personal_contribution)+"</strong>")
					details_div.append("<p>Enrollment: <strong>"+d.total_enrollment+"</strong></p>");
					
					//  histograms...
					
					// gender
					var data = [d.percent_women, d.percent_men];
					var labels = ["Women", "Men"];
					makeHistogram(d, data, labels, "Gender");
						
					// ethnicity
					data = [d.percent_white, d.percent_asian_pacific_islander,
					            d.percent_african_american, d.percent_hispanic, d.percent_native_american, 
					            d.percent_multiracial, d.percent_race_ethnicity_unknown, 
					            d.percent_nonresident_alien];
					labels = ["Caucasian","Asian/Pac-Isld",
					                    "African American","Hispanic","Native American", 
					                    "Multiracial","Unknown","Nonresident"];
					makeHistogram(d, data, labels, "Ethnicity");

					
					// age
					data = [d.percent_under_18, d.percent_18_to_19, 
					            d.percent_20_to_21, d.percent_22_to_24, d.percent_25_to_29, 
					            d.percent_30_to_34, d.percent_35_to_39, 
					            d.percent_40_to_49, d.percent_50_to_64, d.percent_65_over,
					            d.percent_age_unknown];
					labels = ["<18","18-19", "20-21","22-24","25-29","30-34","35-39",
					                  "40-49","50-64","65+", "unknown"];
					makeHistogram(d, data, labels, "Age");
			
				};	
				
				function makeHistogram(d, data, labels, header){
										
					// format histogram area
					var margin = {top: 20, right: 10, bottom: 10, left: 85},
			    	width = 248 - margin.left - margin.right,
			    	height = ((data.length+2)*13) - margin.top - margin.bottom,
			    	padding = 10;
					
					var x0 = d3.max(data);

					var x = d3.scale.linear()
					    .domain([0, x0])
					    .range([0, width])
					    .nice();
					
					var y = d3.scale.ordinal()
					    .domain(d3.range(data.length))
						.rangeRoundBands([0, height], .2);

					var xAxis = d3.svg.axis()
					    .scale(x)
					    .ticks(4)
				    	.orient("top");
					
					var yAxis = d3.svg.axis()
						.scale(y)
						.tickValues(labels)
						.orient("left");

					var svg = d3.select("div.details").append("svg")
					    .attr("width", width + margin.left + margin.right)
					    .attr("height", height + margin.top + margin.bottom)
					    .selectAll(".bar")
					    .data(data)
					  .enter()
					  .append("g")
					    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
					
					  svg.append("svg:text")
				        .attr("x", -6)
				        .attr("y", function(d, i) { return y(i); })
				        .attr("dy", ".35em")
				        .attr("text-anchor", "end");
			
//					var bar = svg.selectAll(".bar")
//					svg.selectAll(".bar")
//					    .data(data)
//					  .enter()
					  svg.append("rect")
					    .attr("class", "bar positive")
					    .attr("x", function(d) { return x(Math.min(0, d)); })
					    .attr("y", function(d, i) { return y(i); })
					    .attr("width", function(d) { return Math.abs(x(d) - x(0)); })
					    .attr("height", y.rangeBand());
				
					svg.append("g")
				    .attr("class", "y axis")
				    .call(yAxis);

					svg.append("g")
				    .attr("class", "x axis")
				    .call(xAxis);

				}
		
				function hideDetailsOnDemand(d) {
					var details_svg = d3.select("div.details").selectAll("svg");
					var details_div = $(".details-on-demand");
					
					
					//clear last record  (remove elements)
					details_svg.remove();		
					details_div.contents().remove();
					$("#default-dod-msg").show();
				}
	
	
			function drawContext(csvData) {
				context.selectAll("g").remove();
				
				//Sort
				if(lastActionSort) {
					csvData = sortData(csvData, sortType);
					lastActionSort = false;
				}
				
				
				
				//You have to update the domain on sorting
				cx.domain(csvData.map(function(d) { return d.id; }));
				cy.domain([0,d3.max(csvData, function(d) { return d.total; })]);
				fy.domain(cy.domain());
				fx.domain(cx.domain().slice(20,40));
				fData = csvData.slice(20,40);
				
				var legendEnter = legend.selectAll(".legend")
				      .data(color.domain().slice().reverse())
				    .enter().append("g")
				      .attr("class", "legend")
				      .attr("transform", function(d, i) { var offset = (i==0)? 0: ((i==1)? 80: 230 );return "translate(" + offset + ",40)"; });

						  legendEnter.append("text")
						      .attr("x", cwidth  - 240)
						      .attr("y", 7)
						      .attr("dy", ".35em")
									.attr("font-size", "10")
						      .style("text-anchor", "start")
						      .text(function(d) { return HEADER_NAME_MAP[d]; });	
										
				  legendEnter.append("rect")
				      .attr("x", cwidth - 256)
				      .attr("width", 12)
				      .attr("height", 12)
				      .style("fill", color);

				  
				
				var contextChart = context.selectAll("g").data(csvData);
				var brush = d3.svg.brush().x(cx).extent([20,40]).on("brush", brushed);
				var contextChartEnter = context.selectAll("g")
				.data(csvData)
				.enter().append("g")
				.attr("class", "context-bar")
				.attr("transform", function(d) { return "translate(" + cx(d.id) + ",0)"; })
				.attr("id", function(d){return d.id;})
				/*.on("mouseover",function(d) { showDetailsOnClick(d);})
				.on("mouseout", function(d) { hideDetailsOnDemand(d);})*/;
				
				//Rendering first layer
				contextChartEnter.append("rect")
				.attr("width", cx.rangeBand())
				.attr("y", function(d) {return cy(d.amounts[0].y1); })
				.attr("class", "rect1")
				.attr("height", function(d) { return cy(d.amounts[0].y0) - cy(d.amounts[0].y1); });
				//.style("fill", function(d) { return color(d.amounts[0].name); });
						
				//Rendering second layer													
				contextChartEnter.append("rect")
				.attr("width", cx.rangeBand())
				.attr("class", "rect2")
				.attr("y", function(d) { return cy(d.amounts[1].y1); })
				.attr("height", function(d) { return cy(d.amounts[1].y0) - cy(d.amounts[1].y1); });
				//.style("fill", function(d) { return color(d.amounts[1].name); });	
				
				//Rendering third layer													
				contextChartEnter.append("rect")
				.attr("width", cx.rangeBand())
				.attr("class", "rect3")
				.attr("y", function(d) { return cy(d.amounts[2].y1); })
				.attr("height", function(d) { return cy(d.amounts[2].y0) - cy(d.amounts[2].y1); });
				//.style("fill", function(d) { return color(d.amounts[2].name); });	
				
				context.append("g").attr("class", "y axis").call(cyAxis);
				
				//set-up brush
				context.append("g")
				.attr("class", "x brush")
				.call(brush)
				.selectAll("rect")
				.attr("y", -6)
				.attr("height", cheight + 7);
				
				
				//Filter
				//Note: Setting the length to 0 is a better way to empty as setting to [] creates a new empty array and screws the references
				filteredData.length = 0;
				filteredIDs.length = 0;
				var filtered = context.selectAll(".context-bar")
												.filter(function(d) {
													
													var df = debtFilter, cf=coaFilter, cn = controlFilter, uf = urbanFilter, st = stateFilter, sz = sizeFilter, sf = searchFilter;
													var sizeValues = SIZE_CATEGORY_ARR.slice(sz[0], sz[1]+1); //+1 to include the end value too
													
													var conCondition = (cn == "All")? 1 : (d["control"] == cn);
													var urbanCondition = (uf == "All")? 1 : (d["degree_urbanization"] == uf);
													var debCondition = (df[0] <= d["debt"] && d["debt"] <= df[1]);
													var coaCondition = (cf[0] <= d["total"] && d["total"] <= cf[1]);
													var stateCondition = (st == "All")? 1 : (d["state"] == st);
													var sizeCondition = (sizeValues.indexOf(d["size_category"]) != -1);  
													var searchCondition = (sf == "")? 1: (sf === d["name"]);
													
													if(conCondition & debCondition & coaCondition & urbanCondition & stateCondition & sizeCondition & searchCondition) {
														filteredData.push(d);
														filteredIDs.push(d.id);
													}
													return  conCondition & debCondition & coaCondition & urbanCondition & stateCondition & sizeCondition & searchCondition; 
												});
												
												context.selectAll(".rect3").style("fill", "#525252");
												context.selectAll(".rect2").style("fill","#737373");
												context.selectAll(".rect1").style("fill","#969696");
												filtered.selectAll(".rect1, .rect2, .rect3").style("fill", "");
												
				$("#counter").html("<span style='color: #E6550D;'>"+filtered[0].length+"</span> of "+csvData.length+" cases shown.");
				//highlightStates(fData);
				drawFocus(fData, focusMode);
				
				function brushed() {
				    var s = d3.event.target.extent();
				    if (s[1]-s[0] <= 20) {
							fx.domain(brush.empty() ? cx.domain() : cx.domain().slice(s[0], s[1]));	
							focus.select(".x.axis").call(fxAxis);
							fData =	cData.slice(s[0],s[1]);
								
							drawFocus(fData, focusMode);	
							//Highlight the states that have been brushed
							//highlightStates(fData);						
				    } else{
							//Restrict the size of brush to the width of focus area
							//d3.event.target.extent([s[0],s[0]+fwidth-1]); 
							d3.event.target.extent([s[0],s[0]+20]);
							d3.event.target(d3.select(this));
						}
				}		
				
				contextChart.exit().remove();
				contextChart.order();								
			}
	
			/*
			** Mode is used to define the comparison axis
			** "onedown" - only first variable will be plotted in negative axis
			** "twodown" - first two variables will be plotted in negative axis
			** "none" - all variables will be plotted on the positive axis
			*/
			function drawFocus(csvData, mode) {
				//Clean the leftovers
				focus.selectAll("g").remove();
				
				// var drag = d3.behavior.drag()
				// 				    .origin(Object)
				// 				    .on("drag", dragmove);
				
				var seriesY = function(seriesId) {
					switch(seriesId) {
						case 0:
						//first layer
						switch(mode){
							case ONEDOWN:
								return (function(d) { return fheight;});
							break;
							case TWODOWN:
								return (function(d) { return fheight + fy(d.amounts[1].y0) - fy(d.amounts[1].y1);});
							break;
							case ALLUP:
								return (function(d) { return fy(d.amounts[0].y1);});
							break;
						}
						
						break;
						case 1:
						//second layer
						switch(mode){
							case ONEDOWN:
								return (function(d) {return fy(d.amounts[1].y1) + fy(d.amounts[0].y0) - fy(d.amounts[0].y1);});
							break;
							case TWODOWN:
								return (function(d) { return fheight;});
							break;
							case ALLUP:
								return (function(d) {return fy(d.amounts[1].y1);});
							break;
						}
						break;
						case 2:
						//third layer
						switch(mode){
							case ONEDOWN:
								return (function(d) { return fy(d.amounts[2].y1) + fy(d.amounts[0].y0) - fy(d.amounts[0].y1);});
							break;
							case TWODOWN:
								return (function(d) { return fheight - fy(d.amounts[2].y0) + fy(d.amounts[2].y1);});
							break;
							case ALLUP:
								return (function(d) { return fy(d.amounts[2].y1);});
							break;
						}
						break;
					}
				};
				//Redraw everything
				var focusChart = focus.selectAll("g").data(csvData);
				var focusChartEnter = focusChart.enter().append("g")
				.attr("class", "focus-bar")
				.attr("transform", function(d) { return "translate(" + fx(d.id) + ",0)"; })
				.attr("fill-opacity",1)
				.attr("id", function(d){return d.id;})
				.on("click", function(d){return showDetailsOnClick(d);} )
				.on("mouseover",function(d) {focus.selectAll(".rect1, .rect2, .rect3").attr("fill-opacity",0.4); d3.select(this).selectAll("rect").attr("fill-opacity",1); })
			.on("mouseout", function(d) {focus.selectAll(".rect1, .rect2, .rect3").attr("fill-opacity",1); /*hideDetailsOnDemand(d);*/});
				
				//Rendering first layer
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(0))
				.attr("class", "rect1")
				.attr("height", function(d) { return fy(d.amounts[0].y0) - fy(d.amounts[0].y1); })
				.append("title").text(function(d) {return "Loan: $"+d.average_amount_any_loan_aid;})
				.transition();
				
						
				//Rendering second layer													
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(1))
				.attr("class", "rect2")
				.attr("height", function(d) { return fy(d.amounts[1].y0) - fy(d.amounts[1].y1); })
				.append("title").text(function(d) {return "Personal Contrib: $"+d.average_amount_personal_contribution;})
				.transition();	
				
				//Rendering third layer													
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(2))
				.attr("class", "rect3")
				.attr("height", function(d) { return fy(d.amounts[2].y0) - fy(d.amounts[2].y1); })
				.append("title").text(function(d) {return "Grant: $"+d.average_amount_any_grant_aid;})
				.transition();
				
				focus.selectAll(".rect3").style("fill", function(d) {return (filteredIDs.indexOf(d.id) != -1)? "":"#525252"; });
				focus.selectAll(".rect2").style("fill",function(d) {return (filteredIDs.indexOf(d.id) != -1)? "":"#737373"; });
				focus.selectAll(".rect1").style("fill",function(d) {return (filteredIDs.indexOf(d.id) != -1)? "":"#969696"; });
				
				focus.append("g")
				.attr("class", "y axis")
				.call(fyAxis);
				
				}
				
				// function hideDetailsOnDemand(d) {
				// 					$(".details-on-demand").contents().remove();
				// 				}
				// 				//focusChart.exit().remove();
				// 				//focusChart.order();
				// 			}


			$( "div.focus div" ).buttonset();
			$("#onedown").click(function(event){ focusMode = ONEDOWN; drawFocus(fData, focusMode);});
			$("#twodown").click(function(event){ focusMode = TWODOWN; drawFocus(fData, focusMode);});
			$("#allup").click(function(event){ focusMode = ALLUP; drawFocus(fData, focusMode);});	

			//Everytime the context is sorted the brushed region has to be resetted
			$( "div#sort-by" ).buttonset();
			$("#state-sort").click(function(event){ lastActionSort = true; sortType = STATE; drawContext(cData);});
			$("#size-sort").click(function(event){ lastActionSort = true; sortType = SIZE; drawContext(cData);});
			$("#debt-sort").click(function(event){ lastActionSort = true; sortType = DEBT; drawContext(cData);});
			$("#grant-sort").click(function(event){ lastActionSort = true; sortType = GRANT; drawContext(cData);});	
			$("#coa-sort").click(function(event){ lastActionSort = true; sortType = COA; drawContext(cData);});
			
			
			
			$("#filter-by").buttonset();
			$("#private-notprofit-filter").click(function(event){ 
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				controlFilter = "Private not-for-profit";
				drawContext(cData);
			});	
			$("#private-profit-filter").click(function(event){ 
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				controlFilter = "Private for-profit";
				drawContext(cData);
			});
			$("#public-filter").click(function(event){
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				controlFilter = "Public";
				drawContext(cData);
			});
			
			$("#all-filter").click(function(event){
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				controlFilter = "All";
				drawContext(cData);
			});
			
			$("#small-filter").click(function(event){ 
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				urbanFilter = "Small";
				drawContext(cData);
			});	
			$("#midsize-filter").click(function(event){
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				urbanFilter = "Midsize";
				drawContext(cData);
			});
			
			$("#large-filter").click(function(event){
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				urbanFilter = "Large";
				drawContext(cData);
			});
			
			$("#all-urban-filter").click(function(event){
				if($(".remove").is(":visible")) {
					$(".remove").trigger("click");
				}
				urbanFilter = "All";
				drawContext(cData);
			});
			
			$(document).tooltip();
			// $(context.selectAll("g")).filter(function(index){console.log(this); return parseInt(this.id) > 40000;}).css("fill-opacity",0.1);
 			        

		}); //(document)