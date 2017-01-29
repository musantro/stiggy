Meteor.methods({

// Right now this function supposes that CSV file has not resets in Time column.
// This is not always true, as Race Studio has Beacon Markers.
// Upcoming: Taking into account every option RaceStudio has with Beacon Markers
// and implement it for easier UX.

    'bench': function(file) {
        var csv = require('fast-csv');
        var fs = require('fs');

        var rows = 0;
        var now = Date.now();
        var metaReadFinish = false;
        var emptyRows = 0;
        var tempArr = [];
        var sampleRate = 0;
        var sensorNames;
        var countRow = 0;
        var tempValues = [];

        Tests.insert({
            _id: file._id,
        });

        Meteor.setTimeout(function() {
            var stream = fs.createReadStream(file.path)
                .pipe(csv())
                .on('readable', Meteor.bindEnvironment(function() {
                    rows++
                    if (rows % 1000 === 0) {
                        console.log("#" + rows + " readed")
                    }
                    var row;
                    while (null !== (row = stream.read())) {

                        if (rows <= 700) { // This is a bug, only reads 1500
                            if (emptyRows < 2) {
                                if (row.length == 0) {
                                    var arr = tempArr;
                                    tempArr = [];

                                    emptyRows++;
                                    console.log("Detected empty line on #" + rows);

                                    switch (emptyRows) {
                                        // SAVE FIRST CSV SECTION - Metadata
                                        case 1:
                                            var metaObj = {};
                                            for (var i = 2; i < arr.length; i++) {
                                                key = arr[i].shift();
                                                if (arr[i].length <= 1) {
                                                    metaObj[key] = arr[i][0]
                                                } else {
                                                    metaObj[key] = arr[i]
                                                }
                                            };

                                            sampleRate = Number(metaObj["Sample Rate"])
                                            console.log(sampleRate + " Hz")
                                            Tests.update({
                                                _id: file._id
                                            }, {
                                                $set: {
                                                    "meta": metaObj
                                                }
                                            });

                                            break;

                                            // SAVE SECOND CSV SECTION - Names
                                        case 2:
                                            sensorNames = arr[0]
                                            for (var i = 0; i < arr[0].length; i++) {
                                                // console.log(i,"arr[0] = ",arr[0]);
                                                Sensors.insert({
                                                    "fromTest": file._id,
                                                    "name": arr[0][i],
                                                    "customName": arr[1][i],
                                                    "units": arr[2][i],
                                                    "sensorId": arr[3][i],
                                                    "sampleRate": sampleRate
                                                })
                                            }

                                            break;

                                    }
                                } else {
                                    tempArr.push(row);
                                };
                            } else {
                                // SAVE THIRD CSV SECTION - Sensor Values
                                if (tempValues.length == 0) {
                                    // if temporary Array to store values does not exist, then create it
                                    tempValues = new Array(row.length);
                                    for (var i = 0; i < row.length; i++) {
                                        tempValues[i] = {};
                                    }
                                }
                                for (var i = 0; i < row.length; i++) {
                                    // create timestamp for the property of each value (milliseconds)
                                    var timestamp = Math.round(Number(row[0]) % 1 * 1000); // this is HARDCODED
                                    // store values in each one
                                    tempValues[i][timestamp] = row[i];
                                }
                                countRow++;
                                if (countRow == sampleRate) {
                                    countRow = 0;
                                    var arr = tempValues;
                                    tempValues = [];
                                    for (var i = 0; i < arr.length; i++) {
                                        Sensors.update({
                                            "fromTest": file._id,
                                            "name": sensorNames[i]
                                        }, {
                                            $push: {
                                                ["values." + Math.round(arr[0][0] / 60) + "." + Math.round(arr[0][0])]: arr[i]
                                            }
                                        });
                                    }
                                }
                            }
                        };



                    }
                }, function(error) {
                    console.log(error);
                }))
                .on('error', function(err) {
                    console.log('Error reading File');
                })
                .on('end', Meteor.bindEnvironment(function(count) {

                    if (tempValues.length != 0) {
                        var arr = tempValues;
                        tempValues = [];
                        for (var i = 0; i < arr.length; i++) {
                            Sensors.update({
                                "fromTest": file._id,
                                "name": sensorNames[i]
                            }, {
                                $set: {
                                    ["values." + Math.round(arr[0][0] / 60) + "." + Math.round(arr[0][0])]: arr[i]
                                }
                            });
                        }
                    }
                    console.log('parsed ' + count + ' rows in ' + (Date.now() - now) / 1000 + ' s');
                }))
        }, 1000)
    }
})

Meteor.publish('Test', function(id) {
    return Sensors.find({
        "fromTest": id
    });
});

Meteor.publish('Meta', function(id) {
    return Tests.find({
        "_id": id
    });
});
