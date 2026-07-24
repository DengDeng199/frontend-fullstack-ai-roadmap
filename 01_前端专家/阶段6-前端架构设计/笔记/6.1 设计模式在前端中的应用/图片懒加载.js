// 真实图片对象
class RealImage{
    constructor(src){ 
        this.img = new Image();  
        this.img.src = src;
    }
    display(){
        document.body.appendChild(this.img)
    }
}

// 代理：先用展位图，滚动到视口再加载真实图
class LazyImage{
    constructor(src){
        this.src = src;
        this.loaded = false;
    }
    display(container){
        container.innerHTML  = `<div class="placeholder">加载中…</div>`
        const io = new IntersectionObserver((entries) => {
            if(entries[0].isIntersecting && !this.loaded) {
                new RealImage(this.src).display()
                this.loaded = true
            }
        })
        io.observe(container)
    }
}