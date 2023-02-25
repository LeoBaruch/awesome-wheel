const isPlainObject = (value) => {
  if(value === null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value); 
  return prototype === Object.prototype || prototype === null;
}



const produce = (origin, thunk) => {
  const proxies = new Map();
  const copies = new Map();

  const proxyTraps = {
    get(target, prop) {
      return createProxy(getCurrentSource(target)[prop])
    },
    has(target, prop) {
      return prop in getCurrentSource(target)
    },
    set(target, prop, value) {
      const current = createProxy(getCurrentSource(target[prop]));
      const newVaule = createProxy(getCurrentSource(value))

      if(current !== newVaule) {
        const copy = getOrCreateCopy(target)
        copy[prop] = newVaule;
      }

      return true;
    },
    deleteProperty(target, prop) {
      const copy = getOrCreateCopy(target);
      delete copy[prop]

      return false
    }
  }

  function getOrCreateCopy(base) {
    let copy = copies.get(base);

    if(!copy) {
      copy = Array.isArray(base) ? [...base] : {...base};

      copies.set(base, copy)
    }

    return copy
  } 

  function getCurrentSource(base) {
    const copy = copies.get(base);
    return copy || base;
  }

  function createProxy(base) {
    if(isPlainObject(base) || Array.isArray(base)) {
      if(proxies.has(base)) {
        return proxies.get(base)
      }
      const proxy = new Proxy(base, proxyTraps);
      proxies.set(base, proxy)
      return proxy
    }
    return base;
  }

  function hasChange(thing) {
    // 没有proxies, 都没访问过对象, 一定没有变过
    if(!proxies.has(thing)) return false;
    // 如果copies存在,一定被set或者delete过属性
    if(copies.has(thing)) return true;

    const keys = Object.keys(thing);
    for(let i = 0; i < keys.length; i++) {
      if(hasChange(thing[keys[i]])) return true;
    }
    return false;
  }
  
  function finalizeObject(base) {
    if(!hasChange(base)) return base;
    const copy = getOrCreateCopy(base);
    Object.keys(copy).forEach(key => {
      copy[key] = finalize(copy[key]);
    })
    return copy;
  }

  function finalizeArray(base) {
    if(!hasChange(base)) return base;
    const copy = getOrCreateCopy(base);
    copy.forEach((_, index) => {
      copy[index] = finalize(copy[index])
    })
    return copy;
  }

  function finalize(base) {
    if(isPlainObject(base)) return finalizeObject(base);
    if(Array.isArray(base)) return finalizeArray(base);
    return base;
  }

  const rootClone = createProxy(origin);
  thunk(rootClone);
  return finalize(origin)
}



console.log('==========demo1 plainObject modify==============')

const demo1 = {
  a: 1,
  b: {
    ba: 1,
    bb: 2,
  },
  c: {
    ca: 1,
    cb: 2,
  }
}
const demo1Res = produce(demo1, (draft) => {
  draft.b.ba = 2;
})

console.log(demo1 === demo1Res)
console.log(demo1.b === demo1Res.b)
console.log(demo1.c === demo1Res.c)
console.log(demo1Res)


console.log('==========demo2 plainObject delete==============')
const demo2 = {
  a: 1,
  b: {
    ba: 1,
    bb: 2,
  },
  c: {
    ca: 1,
    cb: 2,
  }
}
const demo2Res = produce(demo2, (draft) => {
  delete draft.b.ba
}) 
console.log(demo2 === demo2Res)
console.log(demo2.b === demo2Res.b)
console.log(demo2.c === demo2Res.c)
console.log(demo2Res)

console.log('==========demo3 array modify==============')
const demo3 = [
  1,
  {
    a: 1,
    b: {
      c: 2
    },
  },
  {
    a: 1,
    b: 2
  }
];
const demo3Res = produce(demo3, draft => {
  draft[1].a = 2;
})

console.log(demo3 === demo3Res)
console.log(demo3[1] === demo3Res[1])
console.log(demo3[1].b === demo3Res[1].b)
console.log(demo3[2]=== demo3Res[2])
console.log(demo3Res)






