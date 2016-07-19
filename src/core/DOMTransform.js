define(function() {
    return function(newNode, node, blacklist) {
        var parent = null,
            root = newNode,
            clonedNode,
            blacklisted;

        if (blacklist) {
            var keys = Object.keys(blacklist);

            blacklisted = new Array(keys.length);

            keys.forEach(function(key, i) {
                blacklisted[i] = blacklist[key].el;
            });
        }

        do {
            var ignoreChildren = false,
                isBlacklisted = false;

            if (!node) {
                clonedNode = newNode.cloneNode(true);

                parent.appendChild(clonedNode);

                node = clonedNode;

                parent = node.parentNode;

                ignoreChildren = true;
            } else if (!blacklisted || blacklisted.indexOf(node) === -1) {
                if (node.tagName === newNode.tagName) {
                    if (newNode.nodeType === 1) {
                        var name;

                        for (var attributes = Array.prototype.slice.call(node.attributes), i = 0, l = attributes.length; i < l; i++) {
                            name = attributes[i].name;

                            if (!newNode.hasAttribute(name)) {
                                node.removeAttribute(name);
                            }
                        }

                        attributes = newNode.attributes;
                        i = 0;
                        l = attributes.length;

                        for (; i < l; i++) {
                            var attribute = attributes[i],
                                value = attribute.value;

                            name = attribute.name;

                            if (node.getAttribute(name) !== value) {
                                node.setAttribute(name, value);
                            }
                        }

                        node.checked = newNode.checked;
                    } else if (newNode.nodeType === 3) {
                        node.textContent = newNode.textContent;
                    }
                } else {
                    clonedNode = newNode.cloneNode(true);

                    node.parentNode.replaceChild(clonedNode, node);

                    node = clonedNode;

                    parent = node.parentNode;

                    ignoreChildren = true;
                }
            } else {
                isBlacklisted = true;
            }

            var nextNewNode = (!ignoreChildren && newNode.firstChild);

            if (nextNewNode) {
                parent = node;

                node = node.firstChild;
            } else {
                if (!isBlacklisted && !newNode.firstChild) {
                    while (node.firstChild) {
                        node.removeChild(node.firstChild);
                    }
                }

                nextNewNode = newNode.nextSibling;

                if (nextNewNode) {
                    node = node.nextSibling;
                } else {
                    while (node.nextSibling) {
                        node.parentNode.removeChild(node.nextSibling);
                    }

                    do {
                        if (node.nextSibling) {
                            node.parentNode.removeChild(node.nextSibling);
                        }

                        node = node.parentNode;
                    } while ((newNode = newNode.parentNode) && newNode !== root && !newNode.nextSibling);

                    if (newNode === root) {
                        return;
                    }

                    parent = node.parentNode;

                    node = node.nextSibling;

                    nextNewNode = newNode && newNode.nextSibling;
                }
            }

            newNode = nextNewNode;
        } while (newNode);
    };
});
