/**
 * Keep React working when the browser translates the page.
 *
 * Page translators (Chrome / Google Translate, Edge) replace the text nodes
 * React rendered with their own <font> elements. When React later removes or
 * inserts next to one of its original nodes, the DOM says the node is no longer
 * a child of its parent and React crashes with
 *   "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
 * (facebook/react#11538). These guards make those two operations tolerant.
 */
export function installTranslationGuard() {
  if (typeof Node !== 'function' || !Node.prototype) return
  const proto = Node.prototype as Node & { __e2mGuard?: boolean }
  if (proto.__e2mGuard) return
  proto.__e2mGuard = true

  const removeChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // Already moved by a translator: removing it from its real parent keeps the DOM clean.
      if (child.parentNode) child.parentNode.removeChild(child)
      return child
    }
    return removeChild.call(this, child) as T
  }

  const insertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) {
      // Reference node was replaced by a translator: append instead of crashing.
      return insertBefore.call(this, newNode, null) as T
    }
    return insertBefore.call(this, newNode, ref) as T
  }
}
