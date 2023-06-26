const newMessage = (chat, error = false) => {
  const chatMessages = $('div.chat');
  let dClass = chat.from_me ? 'self' : 'other';
  if (chat.text.trim() == "") {
    return;
  }

  if (!chat.text.trim().startsWith("<pre>")) {
    chat.text = `<pre>${chat.text}</pre>`;
  }

  if (error) {
    dClass = "error";
  }

  chatMessages.append(`<div class="${dClass}"><div class="dialog">${chat.text}</div><p>${chat.sent_on.getHours()}:${chat.sent_on.getMinutes()}</p></div>`);
  const contentHeight = chatMessages.prop('scrollHeight');
  const viewportHeight = chatMessages.height();
  chatMessages.scrollTop(contentHeight - viewportHeight);
};

const headMessages = $('td.head div h6');
const beginProgress = () => {
  const intervalId = setInterval(async () => {
    if (headMessages.html() == '·········') {
      headMessages.html('');
      return;
    }
    headMessages.append('·');
  }, 85);

  return intervalId;
}

const clearProgress = (intervalId) => {
  clearInterval(intervalId);
  headMessages.html('')
}

const playNotification = () => {
  try {
    const sound = document.getElementById("notification-sound");
    sound.currentTime = 0;
    sound.play();
  } catch (err) {
    console.log("error:", err);
  }
}

const getWSAddress = () => Cookies.get('WSAddress');
const setWSAddress = (val) => Cookies.set('WSAddress', val, { expires: 7 });
const unsetWSAddress = () => Cookies.remove('WSAddress');

const getWSPath = () => Cookies.get('WSPath');
const setWSPath = (val) => Cookies.set('WSPath', val, { expires: 7 });
const unsetWSPath = () => Cookies.remove('WSPath');

const getWSAuth = () => Cookies.get('WSAuth');
const setWSAuth = (val) => Cookies.set('WSAuth', val, { expires: 7 });
const unsetWSAuth = () => Cookies.remove('WSAuth');


$(document).ready(() => {
  $('#message-input').focus();
  const server = getWSAddress();
  const path = getWSPath();
  const auth = getWSAuth();

  if (server && path && auth) {
    let authObj = {};
    if (auth.split(' ').length == 2) {
      authObj[auth.split(' ')[0]] = auth.split(' ')[1]
    }

    const socket = io(server, {
      forceNew: true,
      path: path,
      transports: ['websocket'],
      auth: authObj
    });

    socket.io.on("error", (error) => {
      newMessage({
        from_me: false,
        text: `Error: ${error.message}\nFailed connctiong to <strong>${server}</strong>\npath: ${path}\nauth: ${JSON.stringify(authObj, null, 2)}\n\nuse <strong>:reset</strong> to reconfigure your connection`,
        sent_on: new Date(),
      }, true)
    });

    socket.io.on("reconnect", (_) => $('div.ic').html('🟠'));

    const messageInput = $('#message-input');
    const typingSessions = [];
    let loaderId = null;
    socket.onAny((e, t) => void 0 === t ? console.log(`🔔 %c${e}`, "font-weight: bold; color: #34eb64;") : (console.log(`🔔 %c${e}`, "font-weight: bold; color: #34eb64;"), console.log(t)))
    socket.on("ready", data => {
      newMessage({
        from_me: false,
        text: `Socket connected to <strong>${server}</strong>\n\nuse <strong>:reset</strong> to reconfigure your connection`,
        sent_on: new Date(),
      });
      $('div.ic').html('🟢');
      data.chat_histories.forEach(item => {
        item.sent_on = new Date(`${item.sent_on}Z`);
        newMessage(item)
      });
      playNotification();
    });
    socket.on("message", (data) => {
      data.sent_on = new Date(`${data.sent_on}Z`);
      newMessage(data);
      if (!data.from_me) {
        playNotification();
      }
    });
    socket.on('typing', (data) => {
      if (data.state == 'BEGIN') {
        if (typingSessions.length == 0) {
          loaderId = beginProgress();
        }
        typingSessions.push(data.uid);
      } else {
        const index = typingSessions.indexOf(data.uid);
        if (index !== -1) {
          typingSessions.splice(index, 1);
        }

        if (typingSessions.length == 0) {
          clearProgress(loaderId);
        }
      }
      console.log(data);
    });

    socket.on('disconnect', () => {
      $('div.ic').html('🔴');
      console.log("\uD83D\uDD34 %cdisconnected", "font-weight: bold; color: red;");
      newMessage({
        from_me: false,
        text: `Connection disconnected\n\nuse <strong>:reset</strong> to reconfigure your connection`,
        sent_on: new Date(),
      }, true);
    });

    messageInput.keydown(function (e) { 13 !== e.keyCode || e.shiftKey || (e.preventDefault(), emit()) });

    const emit = () => {
      const text = messageInput.val();
      newMessage({
        from_me: true,
        text: text,
        sent_on: new Date(),
      });
      socket.emit("message", text);
      messageInput.val('');
    };
  } else {
    const messageInput = $('#message-input');
    unsetWSAddress();
    unsetWSPath();
    unsetWSAuth();

    newMessage({
      from_me: false,
      text: "<pre>Please enter the socket address\nexample: ws://localhost:8080/myNamespace</pre>",
      sent_on: new Date(),
    });

    let provided = false;
    messageInput.keydown(function (e) {
      13 !== e.keyCode || e.shiftKey || (() => {
        e.preventDefault();

        if (!provided) {
          setWSAddress(messageInput.val().trim());
          newMessage({
            from_me: true,
            text: `<pre>${messageInput.val()}</pre>`,
            sent_on: new Date(),
          });
          messageInput.val('');
          provideSocketPath();
          provided = true;
        }
      })()
    });

    const provideSocketPath = () => {
      newMessage({
        from_me: false,
        text: "<pre>Please enter the socket path\nexample: /ws</pre>",
        sent_on: new Date(),
      });

      let provided = false;
      messageInput.keydown(function (e) {
        13 !== e.keyCode || e.shiftKey || (() => {
          e.preventDefault();

          if (!provided) {
            setWSPath(messageInput.val().trim());
            newMessage({
              from_me: true,
              text: `<pre>${messageInput.val()}</pre>`,
              sent_on: new Date(),
            });
            messageInput.val('');
            provideSocketAuth();
            provided = true;
          }
        })()
      });
    }

    const provideSocketAuth = () => {
      newMessage({
        from_me: false,
        text: "<pre>Please enter the socket jwt auth\nexample: jwt eyJ0eXAiOiJK1NiJ9.eyJ1c2Vy.....\n'jwt' is auth header name, and 'eyJ0eXAi...' is auth header value.</pre>",
        sent_on: new Date(),
      });

      let provided = false;
      messageInput.keydown(function (e) {
        13 !== e.keyCode || e.shiftKey || (() => {
          e.preventDefault();
          if (!provided) {
            setWSAuth(messageInput.val().trim());
            newMessage({
              from_me: true,
              text: `<pre>${messageInput.val()}</pre>`,
              sent_on: new Date(),
            });
            messageInput.val('');
            provided = true;
            window.location.reload(true);
          }
        })()
      });
    }
  }
});

const messageInput = $('#message-input');
messageInput.keydown(function (e) {
  13 !== e.keyCode || e.shiftKey || (() => {
    e.preventDefault();
    if (messageInput.val().trim().toLowerCase() == ':reset') {
      unsetWSAddress();
      unsetWSPath();
      unsetWSAuth();
      window.location.reload(true);
    }
  })()
});