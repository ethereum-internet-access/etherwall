require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const axios = require('axios')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.listen(process.env.PROXY_PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PROXY_PORT}`)
})

app.post('/', async (req, res, next) => {
  console.log(req.body)
  let infuraUrl = `https://${process.env.INFURA}/v3/${process.env.INFURA_PROJECT}`
  console.log(infuraUrl)
  let infuraResponse = await axios.post(infuraUrl, req.body)
  console.log(infuraResponse.data)
  res.status(infuraResponse.status).send(infuraResponse.data)
})
