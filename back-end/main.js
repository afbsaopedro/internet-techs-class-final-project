const express = require("express");
const { Pool } = require("pg")
const cors = require("cors")
const { CronJob } = require("cron")

const app = express();

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'sensors',
    password: 'admin',
    port: 6970,
})

app.use(express.json())
app.use(cors())

app.get("/helloworld", function(req, res) {
    res.send({
        message: "hello world"
    });
})

app.post("/devices", function (req, res) {
    pool.query(
        "insert into devices (name, lat, lon) values($1, $2, $3) returning *",
        [req.body.name, req.body.lat, req.body.lon],
        function(error, results) {
            if(error) {
                res.status(500)
               res.send({
                   message: error
               })
                return
            }

            res.status(200)
            res.send(results.rows[0])
    })
})

app.get("/devices", function (req, res) {
    pool.query ("select * from devices order by id", [], function (error, results) {
        if (error) {
            res.status(500)
            res.send(
                {message: error}
            )
            return

        }

        res.status(200)
        res.send(results.rows)
    })
})

// good practice - not using body in GET requests
// /devices/:id
app.get("/devices/:id", function (req, res) {
    pool.query ("select * from devices where id=$1", [req.params.id], function (error, results) {
        if (error) {
            res.status(500)
            res.send({
                message: error
            })
            return
        }
        if (results.rows.length == 0) {
            res.status(404)
            res.send ({
                message: "device not found"
            })
        }
        res.status(200)
        res.send(results.rows[0]) // passar logo index 0 para receber so um objecto no front end
    })
})

app.get("/devices/:id/readings", function (req, res) {
    pool.query ("select date, value from readings where deviceid=$1 order by date desc", [req.params.id], function(error, results) {
        if (error) {
            res.status(500)
            res.send({
                message: error
            })
            return
        }
        if (results.rows.length == 0) {
            res.status(404)
            res.send ({
                message: "readings not found"
            })
            return
        }
        res.status(200)
        res.send(results.rows)
    })
})

app.delete("/devices/:id", function (req, res) {
    pool.query ("delete from devices where id=$1", [req.params.id], function (error, results) {
        if (error) {
            res.status(500)
            res.send ({
                message: "unable to delete device"
            })
            return
        }
        res.status(200)
        res.send ({
            message: "device deleted"
        })
    })
})

app.put("/devices/:id", function (req, res) {
    pool.query ("update devices set name = $1 where id=$2", [req.body.name, req.params.id],
        function (error, results) {
        if (error) {
            res.status(500)
            res.send ({
                message: "unable to update device info"
            })
            return
        }
            res.status(200)
            res.send({
                message: "device info updated"
            })
        })
})

const job = new CronJob('*/60 * * * * *', function() {
    pool.query ("select * from devices order by id", [], function (error, results) {
        if (error) {
            return
        }
        
        for (let i = 0; i < results.rows.length; i++) {
            const device = results.rows[i]
            // current device no index i

            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${device.lat}&longitude=${device.lon}&past_days=10&hourly=temperature_2m`)
                .then(function(response) {
                    return response.json()
                })
                .then(function(data) {
                    // data -> hourly -> time: array, temperature_2m: array
                    for (let i = 0; i < data.hourly.time.length; i++) {
                        const time = data.hourly.time[i]
                        const temp = data.hourly.temperature_2m[i]
                        
                        pool.query ("insert into readings (deviceid, date, value) values($1, $2, $3) on conflict do nothing", [device.id, time, temp])
                    }
                }).catch(function(error) {
                    console.log(error);
                })
        }
        
    })

    
})

job.start()

app.listen(5000, "localhost", function() {
    console.log("Server is running on port 5000");
})