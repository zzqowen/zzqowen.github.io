---
title: mac基础操作
p: mac/operate
date: 2019-09-18 17:36:45
date_type: updated
comments: true
tags:
- Mac
categories: 
- Mac
- 笔记
---

### Mac基础命令

```b
$ hexo new "My New Post66666"
```

```javascript
  var ihubo = {
    nickName  : "草依山",
    site : "http://jser.me"
  }
```
{% asset_img mac1.jpg%}
{% blockquote %}
**Mac显示隐藏文件命令**
defaults write com.apple.finder AppleShowAllFiles Yes && killall Finder (显示)
defaults write com.apple.finder AppleShowAllFiles No && killall Finder (隐藏)

**Mac命令行安装需要管理员权限Please try running this command again as root/Administrator**
sudo chown -R $USER /usr/local
{% endblockquote %}
