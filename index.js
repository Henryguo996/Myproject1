//建立資料庫連線
const mongo = require("mongodb");
const uri =
  "mongodb+srv://nicev996:vvan1015@nicevground.6j7wzb6.mongodb.net/?retryWrites=true&w=majority";

//建立客戶端物件
// const client = new mongo.MongoClient(uri);
const client = new mongo.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//建立空值代表未連線成功
let db = null;
// client.connect(async (err) => {
//   if (err) {
//     console.log("資料庫連線失敗", err);
//     return;
//   }
//   db = client.db("member-system");
//   console.log("資料庫連線成功");
// });

//資料庫連線
async function initDB() {
  await client.connect();
  if (await client.connect()) {
    console.log("資料庫連線成功");
    db = client.db("member-system");
    // 後續的資料庫操作
    // client.close(); // 關閉資料庫
  } else {
    console.log("資料庫連線失敗", err);
    return;
  }
}
initDB();

//建立網站伺服器：
const express = require("express");
const app = express();
const path = require("path");
const PORT = process.env.PORT || 10000;

var initApp = function () {
  parseCommand();
};

app.on("ready", initApp);

//使用者狀態管理
const session = require("express-session");
app.use(
  session({ secret: "anything", resave: false, saveUninitialized: true })
);

//樣版引擎
app.set("view engine", "ejs");
app.set("views", "./views");

//靜態檔案
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "/public")));

//POST方法參數
app.use(express.urlencoded({ extends: true }));

//--------------------------------------------------------------------------
//建立需要的路由
//會員首頁
app.get("/", (req, res) => {
  res.render("home.ejs");
});

//join會員路由
app.get("/joinmember", (req, res) => {
  res.render("joinmember.ejs");
});

//韓劇新聞的路由
app.get("/news1", (req, res) => {
  res.render("news1.ejs");
});
app.get("/news2", (req, res) => {
  res.render("news2.ejs");
});
app.get("/news3", (req, res) => {
  res.render("news3.ejs");
});

//關於我們的路由
app.get("/company", (req, res) => {
  res.render("company.ejs");
});

//聯絡我們的路由
app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

//會員資料
app.get("/memberprofile", (req, res) => {
  //從session取得登入會員的
  const name = req.session.member.name;
  const email = req.session.member.email;
  const birthday = req.session.member.birthday;
  const phone = req.session.member.phone;
  const password = req.session.member.password;

  res.render("memberprofile.ejs", {
    name: name,
    email: email,
    birthday: birthday,
    phone: phone,
    password: password,
  });
});

//會員變更密碼
app.post("/update", async (req, res) => {
  if (
    (req.body.password == " ") &
    (req.body.password === req.session.member.password)
  ) {
    res.redirect("/memberprofile");
    return;
  }
  //檢查資料庫中的資料
  const collection = db.collection("member");

  //從session取得登入會員的
  const email = req.session.member.email;
  const birthday = req.session.member.birthday;
  const phone = req.session.member.phone;
  const password = req.session.member.password;
  const updatepassword = req.body.password;
  await collection.updateOne(
    {
      email: email,
    },
    {
      $set: {
        password: updatepassword,
      },
    }
  );

  res.redirect("/memberprofile");
});

//會員刪除帳號
app.post("/delete", async (req, res) => {
  //檢查資料庫中的資料
  const collection = db.collection("member");

  //從session取得登入會員的
  const email = req.session.member.email;
  const birthday = req.session.member.birthday;
  const phone = req.session.member.phone;
  const password = req.session.member.password;
  await collection.deleteOne({
    email: email,
  });

  res.redirect("/joinmember");
});

//註冊會員的路由
app.post("/signup", async (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const password2 = req.body.password2;
  const collection = db.collection("member");
  let result = await collection.findOne({
    email: email,
  });
  if (result !== null) {
    //email已存在
    res.redirect("/error?msg=註冊失敗，信箱重複！");
    return;
  }

  if (result == null && name == "") {
    res.redirect("/error?msg=名稱不可空白");
    return;
  }

  if (result == null && password !== req.body.password2) {
    res.redirect("/error?msg=兩次密碼不一致");
    return;
  }

  if (password === password2) {
    //將新的會員資料放到資料庫
    result = await collection.insertOne({
      name: name,
      email: email,
      password: password,
    });
  }
  //新增成功導回註冊會員成功頁面
  res.redirect("/login");
  // //新增成功導回首頁
  // res.redirect("/joinmember");
});

//註冊會員成功的訊息
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

//登入會員的路由
app.post("/signin", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  //檢查資料庫中的資料
  const collection = db.collection("member");
  let result = await collection.findOne({
    $and: [{ email: email }, { password: password }],
  });
  if (result === null) {
    res.redirect("/error?msg=登入失敗，郵件或密碼錯誤");
    return;
  }
  //登入成功，紀錄會員資訊在session中
  req.session.member = result;
  res.redirect("/member");
});

//連線到/error?msg=錯誤訊息
app.get("/error", (req, res) => {
  const msg = req.query.msg;
  res.render("error.ejs", { msg: msg });
});

//----------------------------------------------------
//會員頁面 and 3月3-1開播的路由
app.get("/member", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-2開播的路由
app.get("/member3-2", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-2.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-3開播的路由
app.get("/member3-3", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-3.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-4開播的路由
app.get("/member3-4", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-4.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-5開播的路由
app.get("/member3-5", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-5.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-6開播的路由
app.get("/member3-6", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-6.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-7開播的路由
app.get("/member3-7", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-7.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-8開播的路由
app.get("/member3-8", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-8.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-9開播的路由
app.get("/member3-9", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-9.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-10開播的路由
app.get("/member3-10", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-10.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面3月3-11開播的路由
app.get("/member3-11", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member3-11.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//-------------------------------------------------------
//會員頁面2月2-1播出的路由
app.get("/member2-1", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member2-1.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面2月2-1播出的路由
app.get("/member2-2", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member2-2.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面2月2-3播出的路由
app.get("/member2-3", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member2-3.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面2月2-4播出的路由
app.get("/member2-4", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member2-4.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面2月2-5播出的路由
app.get("/member2-5", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member2-5.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面2月2-6播出的路由
app.get("/member2-6", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member2-6.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});
//-------------------------------------------------------

//-------------------------------------------------------
//會員頁面1月1-1播出的路由
app.get("/member1-1", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member1-1.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面1月1-2播出的路由
app.get("/member1-2", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member1-2.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面1月1-3播出的路由
app.get("/member1-3", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member1-3.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面1月1-4播出的路由
app.get("/member1-4", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member1-4.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面1月1-5播出的路由
app.get("/member1-5", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member1-5.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面1月1-6播出的路由
app.get("/member1-6", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member1-6.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});

//會員頁面1月1-7播出的路由
app.get("/member1-7", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("member1-7.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });

  // //取得所有會員的名稱
  // const collection = db.collection("member");
  // let result = await collection.find({});
  // let data = [];
  // await result.forEach((member) => {
  //   data.push(member);
  // });
  // res.render("member.ejs", {
  //   name: name,
  //   data: data,
  // }); //data傳入所有會員名稱
});
//-------------------------------------------------------

//會員排行頁面的路由
app.get("/membertop10", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("membertop10.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });
});

//會員排行頁面-2的路由
app.get("/membertop10-2", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("membertop10-2.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });
});

//會員排行頁面-1的路由
app.get("/membertop10-1", async (req, res) => {
  if (!req.session.member) {
    //檢查有沒有正確程序登入會員
    res.redirect("/joinmember");
    return;
  }

  //從session取得登入會員的名稱、留言

  const name = req.session.member.name;
  const collection_M = db.collection("message");
  const comment = req.query.comment;
  let comments = [];
  let result = await collection_M.find({});
  await result.forEach((comment) => {
    comments.push(comment);
  });
  res.render("membertop10-1.ejs", {
    name: name,
    comment: comment,
    comments: comments,
  });
});

//建立送出留言路由
app.get("/signin-comment", async function (req, res) {
  if (!req.session.member) {
    res.redirect("/joinmember");
    return;
  }
  const collection = db.collection("message");
  const name = req.session.member.name;
  const comment = req.query.comment;
  var timestamp = new Date().getTime();
  let date = new Date(timestamp);
  const dateValues = [
    `${date.getFullYear()}/${
      date.getMonth() + 1
    }/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
  ];
  let result = await collection.insertOne({
    name: name,
    dateValues: dateValues,
    comment: comment,
  });
  res.redirect("/member");
  return;
});

//登出會員功能的路由
app.get("/signout", (req, res) => {
  req.session.member = null;
  res.redirect("/joinmember");
});

//啟動伺服器
// app.listen(3000, () => {
//   console.log("Server Started...");
// });

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});
