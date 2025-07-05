// TODO: Thay cấu hình Firebase này bằng cấu hình của bạn
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUserRole = "user";

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => window.location.href = "dashboard.html")
        .catch(err => document.getElementById('error').innerText = err.message);
}

function logout() {
    auth.signOut().then(() => window.location.href = "index.html");
}

if (window.location.pathname.includes("dashboard.html")) {
    auth.onAuthStateChanged(async user => {
        if (!user) {
            alert("Bạn chưa đăng nhập!");
            window.location.href = "index.html";
        } else {
            const userDoc = await db.collection("users").doc(user.uid).get();
            currentUserRole = userDoc.exists ? userDoc.data().role : "user";

            if (currentUserRole !== "admin") {
                document.getElementById("uploadSection").style.display = "none";
                document.getElementById("createUserSection").style.display = "none";
            }

            loadDocuments();
        }
    });
}

function uploadPDF() {
    const file = document.getElementById('pdfFile').files[0];
    const title = document.getElementById('title').value;
    const subject = document.getElementById('subject').value;
    const grade = document.getElementById('grade').value;
    const year = document.getElementById('year').value;

    if (!file || !title || !subject || !grade || !year) {
        return alert("Vui lòng nhập đầy đủ thông tin đề thi.");
    }

    const storageRef = storage.ref("documents/" + file.name);
    storageRef.put(file).then(snapshot => {
        snapshot.ref.getDownloadURL().then(url => {
            db.collection("documents").add({
                title, subject, grade, year,
                url: url,
                timestamp: Date.now()
            }).then(() => {
                alert("Tải lên thành công!");
                renderDocuments();
            });
        });
    });
}

function loadDocuments() {
    db.collection("documents").orderBy("timestamp", "desc").onSnapshot(snapshot => {
        const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.allDocuments = documents;
        renderDocuments();
    });
}

function renderDocuments() {
    const keyword = document.getElementById("search").value.toLowerCase();
    const list = document.getElementById("documentList");
    list.innerHTML = "";

    const docs = window.allDocuments || [];
    docs.filter(doc =>
        doc.title.toLowerCase().includes(keyword) ||
        doc.subject.toLowerCase().includes(keyword) ||
        doc.grade.includes(keyword) ||
        doc.year.includes(keyword)
    ).forEach(doc => {
        const li = document.createElement("li");
        li.innerHTML = `<a class="text-blue-600 underline" href="${doc.url}" target="_blank">${doc.title}</a>
        <div class="text-sm text-gray-600">Môn: ${doc.subject} | Lớp: ${doc.grade} | Năm: ${doc.year}</div>`;
        list.appendChild(li);
    });
}

// Tạo user mới (chỉ admin)
async function createUser() {
    const email = document.getElementById("newUserEmail").value;
    const role = document.getElementById("newUserRole").value;

    if (!email || !role) return alert("Nhập đầy đủ email và vai trò");

    try {
        const userRecord = await auth.createUserWithEmailAndPassword(email, "123456"); // Mặc định mật khẩu
        await db.collection("users").doc(userRecord.user.uid).set({ role });
        alert("Tạo tài khoản thành công!");
    } catch (err) {
        alert("Lỗi tạo user: " + err.message);
    }
}
