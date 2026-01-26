now I will explain project next step. in this new version we will build real produxtion based project. In this project we do not need any database and we do not need save any logs. There are already backend written and we have ready APIs to save student vector image and get it. we have also attendace, teacher modules, slots, classes APIs. I will step byt step give gou APIs and instruction how to use it you should imaplement them.

curl -X 'POST'
  'https://newattendanceapi.wiut.uz/api/Auth/Login'
  -H 'accept: */*'
  -H 'Content-Type: application/json'
  -d '{
  "username": "a_pulatov",
  "password": "WeWillRock012026"
}'

API to get token

Response body

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6IjdkNWU4Y2Y4LTU2MjItNDg1My1iODU0LTIxNDRkY2U0NWNiNyIsImV4cCI6MTc2OTQwOTQyNywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.tsVh3R4ucJTXrKaMs3S9SC_ksMkZQUDmyuYPQPZX-c4",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsInR5cCI6InJlZnJlc2giLCJleHAiOjE3NzE5OTc4MjcsImlzcyI6Ik15QXBwIiwiYXVkIjoiTXlBcHBVc2VycyJ9.mTM1QTiwb2IM3za3a2wJm_2drpVkKJw0eGi5wYMIKOs"
}

you should save it and implement refresh token logic.

curl -X 'POST'
  'https://newattendanceapi.wiut.uz/api/Auth/Refresh'
  -H 'accept: */*'
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6IjdkNWU4Y2Y4LTU2MjItNDg1My1iODU0LTIxNDRkY2U0NWNiNyIsImV4cCI6MTc2OTQwOTQyNywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.tsVh3R4ucJTXrKaMs3S9SC_ksMkZQUDmyuYPQPZX-c4'
  -H 'Content-Type: application/json'
  -d '{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsInR5cCI6InJlZnJlc2giLCJleHAiOjE3NzE5OTc4MjcsImlzcyI6Ik15QXBwIiwiYXVkIjoiTXlBcHBVc2VycyJ9.mTM1QTiwb2IM3za3a2wJm_2drpVkKJw0eGi5wYMIKOs"
}'

Response body

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6ImUwMzlmODJhLWVmYWItNGQ4NS05YjQ2LTM5MWU3NjM1MjJhNCIsImV4cCI6MTc2OTQxMDI5NCwiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.kOh3jVt67YHqmsbTksA0lCgvc0c1WmLvmbCjYWd8nYk"
}

bellow api to get teacher modules
curl -X 'POST'
  'https://newattendanceapi.wiut.uz/api/Attendance/MyModulesStaff'
  -H 'accept: */*'
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6IjdkNWU4Y2Y4LTU2MjItNDg1My1iODU0LTIxNDRkY2U0NWNiNyIsImV4cCI6MTc2OTQwOTQyNywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.tsVh3R4ucJTXrKaMs3S9SC_ksMkZQUDmyuYPQPZX-c4'
  -d ''

Response body
[
  {
    "id": 785,
    "name": "Contract Law",
    "code": "4LLAW020C-n"
  }
]

There are several teachings weeks will be available to do attendace for teachers.
curl -X 'POST'
  'https://newattendanceapi.wiut.uz/api/Attendance/LessonsByParams'
  -H 'accept: */*'
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6IjdkNWU4Y2Y4LTU2MjItNDg1My1iODU0LTIxNDRkY2U0NWNiNyIsImV4cCI6MTc2OTQwOTQyNywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.tsVh3R4ucJTXrKaMs3S9SC_ksMkZQUDmyuYPQPZX-c4'
  -H 'Content-Type: application/json'
  -d '{
  "moduleId": 785,
  "teachingType": 2
}'

Response body
{
  "slots": [
    {
      "dayOfWeek": "Monday",
      "user": "el.ziyadullaeva",
      "time": "09:00 - 11:00",
      "guidID": "a06c076b-f592-4596-9d64-7244e6d5e576"
    },
    {
      "dayOfWeek": "Monday",
      "user": "el.ziyadullaeva",
      "time": "13:00 - 15:00",
      "guidID": "a42175a1-45d7-40d5-a48e-9cba64d2e085"
    },
    {
      "dayOfWeek": "Tuesday",
      "user": "an.turakhudjaeva",
      "time": "09:00 - 11:00",
      "guidID": "f7cb7ef8-b762-41e4-8256-ed6d7ab1b484"
    },
    {
      "dayOfWeek": "Tuesday",
      "user": "an.turakhudjaeva",
      "time": "11:00 - 13:00",
      "guidID": "ab08ba4f-7a90-4072-a80a-6c85d3590022"
    },
    {
      "dayOfWeek": "Thursday",
      "user": "an.turakhudjaeva",
      "time": "14:00 - 16:00",
      "guidID": "906fb8b0-60a4-4b25-9a14-aa7a0381967b"
    },
    {
      "dayOfWeek": "Thursday",
      "user": "an.turakhudjaeva",
      "time": "16:00 - 18:00",
      "guidID": "08b43016-d7af-419e-844d-c832360e8d87"
    },
    {
      "dayOfWeek": "Friday",
      "user": "el.ziyadullaeva",
      "time": "12:00 - 14:00",
      "guidID": "c041e6ae-2b03-48b2-b285-fd7a8d6c71fc"
    }
  ],
  "attClasses": [
    {
      "classId": 46703,
      "teachingWeek": "TW1",
      "teachingType": "Seminar 1"
    },
    {
      "classId": 46890,
      "teachingWeek": "TW2",
      "teachingType": "Seminar 1"
    }
  ]
}

in this response body you can see teaching week, classId, teaching type (1-seminar, 2-workshop)

curl -X 'POST' \

  'https://newattendanceapi.wiut.uz/api/Attendance/SetEmbedding' \

  -H 'accept: */*' \

  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6IjdkNWU4Y2Y4LTU2MjItNDg1My1iODU0LTIxNDRkY2U0NWNiNyIsImV4cCI6MTc2OTQwOTQyNywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.tsVh3R4ucJTXrKaMs3S9SC_ksMkZQUDmyuYPQPZX-c4' \

  -H 'Content-Type: application/json' \

  -d '{

  "userId": "00019880",

  "pathImage": "string", //leave it static

  "faceEmbeding": "there should be face emmbedding",

  "embedderMetod": "there should be embedding method type"

}'

above api to save student embedded vector form images to later use it to compare

curl -X 'POST' \

  'https://newattendanceapi.wiut.uz/api/Attendance/SetAttendanceStudent' \

  -H 'accept: */*' \

  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6IjdkNWU4Y2Y4LTU2MjItNDg1My1iODU0LTIxNDRkY2U0NWNiNyIsImV4cCI6MTc2OTQwOTQyNywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.tsVh3R4ucJTXrKaMs3S9SC_ksMkZQUDmyuYPQPZX-c4' \

  -H 'Content-Type: application/json' \

  -d '{

  "classId": 46703,

  "userId": "00019880",

  "confidence": 56

}'

above API to set attendace students. from face recognition if student recognition % more then 50% we should use this API  and put that % as a value of confidance. there should be manual attendace feature also for teacher. if teacher manually set student attendace true confidance value should be 105 and if false confidance value should be -1.

```bash
curl -X 'POST' \
'https://newattendanceapi.wiut.uz/api/Attendance/StudentsByLesson?LessonGuidId=c041e6ae-2b03-48b2-b285-fd7a8d6c71fc&embeddingType=dilmurod&classId=46703' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmU2Yzc3MS03MzNhLTRhY2ItOGFmMS1jOWZjOWFiNWM3OGYiLCJ1bmlxdWVfbmFtZSI6ImFfcHVsYXRvdiIsImp0aSI6IjdkNWU4Y2Y4LTU2MjItNDg1My1iODU0LTIxNDRkY2U0NWNiNyIsImV4cCI6MTc2OTQwOTQyNywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.tsVh3R4ucJTXrKaMs3S9SC_ksMkZQUDmyuYPQPZX-c4' \
  -d ''


Response body
[
  {
    "userId": "00019877",
    "fullName": "Lobar Abdumuminova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00019880",
    "fullName": "Shahzoda Jo'rayeva",
    "isAttended": true,
    "confidence": 56,
    "faceEmbedders": ""
  },
  {
    "userId": "00018135",
    "fullName": "Aziza Zubaydullayeva",
    "isAttended": false,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00019597",
    "fullName": "Zilolaxon Sobirjonova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00019695",
    "fullName": "Aziza Esanboeva",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00019906",
    "fullName": "Kamilla Xalikova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00019460",
    "fullName": "Xanifaxon Mansurdjanova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020688",
    "fullName": "Ulug'bek Axmedov",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00021541",
    "fullName": "Sevara Turdalieva",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00021594",
    "fullName": "Shushanika Ergasheva",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00021691",
    "fullName": "Rayxona Xodjamuxamedova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00021797",
    "fullName": "Shirin Nasirova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00024420",
    "fullName": "Vazira Madjitova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00024627",
    "fullName": "Robiyaxon Nazir Ahmad",
    "isAttended": false,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020432",
    "fullName": "Saidodilxon Azmiddinxo'jayev",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020513",
    "fullName": "Jafar Musakhujaev",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020538",
    "fullName": "Sokhida Turgunova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020595",
    "fullName": "Damir Dushkin",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020656",
    "fullName": "Ulug'bek To'laganov",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020774",
    "fullName": "Samira Xodjayeva",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020775",
    "fullName": "Samira Khasanova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020829",
    "fullName": "Nozimaxon Abdukaxxorova",
    "isAttended": true,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00020958",
    "fullName": "Laylo Samariddinova",
    "isAttended": false,
    "confidence": 0,
    "faceEmbedders": ""
  },
  {
    "userId": "00021478",
    "fullName": "Sugdiyona Abdurasulova",
    "isAttended": false,
    "confidence": 0,
    "faceEmbedders": ""
  }
]
```


above api to get student list with lessonGuidId and classId

these are all of our project logic. We have 3 steps. first step is remove all current UI and extra logic in backend and in pythn also. secon step is building modern UI with good UX based on our project logic. third step is implement project logic. after each step I will check your work and when i tell you lets move to next step you should move on.
