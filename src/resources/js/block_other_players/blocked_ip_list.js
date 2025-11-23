/**
 * Class representing a blocked IP
 */
class BlockedIP {
  /**
   * Create a BlockedIP object
   * @param {string} hashedIP
   * @param {string} partialIP
   * @param {number} [blockedTime]
   * @param {string} [remark]
   */
  constructor(hashedIP, partialIP, blockedTime = Date.now(), remark = '') {
    this.hashedIP = hashedIP;
    this.partialIP = partialIP;
    this.blockedTime = blockedTime;
    this.remark = remark;
  }
}

/**
 * Class representing a list of blocked IPs
 */
class BlockedIPList {
  /**
   * Create a BlockedIPLIst object
   * @param {number} maxLength
   */
  constructor(maxLength) {
    this._blockedIPs = [];
    this._peerHashedIP = null;
    this.maxLength = maxLength;
  }

  get length() {
    return this._blockedIPs.length;
  }

  /**
   * Return if the list is full
   * @returns {boolean}
   */
  isFull() {
    return this.length >= this.maxLength;
  }

  /**
   * Stage the hashed IP of the peer
   * @param {string} peerHashedIP
   */
  stagePeerHashedIP(peerHashedIP) {
    this._peerHashedIP = peerHashedIP;
  }

  /**
   * Return if a peer hashed IP is staged
   * @returns {boolean}
   */
  isPeerHashedIPStaged() {
    return this._peerHashedIP !== null;
  }

  /**
   * Add the staged peer hashed IP to blocked IP list
   * @param {string} peerPartialIP
   */
  AddStagedPeerHashedIPWithPeerPartialIP(peerPartialIP) {
    if (!this.isPeerHashedIPStaged() || this.isFull()) {
      return;
    }
    this._blockedIPs.push(new BlockedIP(this._peerHashedIP, peerPartialIP));
  }

  /**
   * Remove a blocked IP at index from the list
   * @param {number} index
   */
  removeAt(index) {
    this._blockedIPs.splice(index, 1);
  }

  /**
   * Edit remark of a BlockedIP object at index
   * @param {number} index
   * @param {string} newRemark
   */
  editRemarkAt(index, newRemark) {
    this._blockedIPs[index].remark = newRemark;
  }

  /**
   * Create a read-only 2D array whose elements have a structure of [ip, blockedTime, remark].
   * And the elements have same indices as in the this._blockedIPs.
   * @returns {[string, string, number, string][]}
   */
  createArrayView() {
    return this._blockedIPs.map((blockedIP) => [
      blockedIP.hashedIP,
      blockedIP.partialIP,
      blockedIP.blockedTime,
      blockedIP.remark,
    ]);
  }

  /**
   * Read a 2D array which has the same structure of an array created by {@link createArrayView}
   * and update this._blockedIPs from it.
   * @param {[string, string, number, string][]} arrayView
   */
  readArrayViewAndUpdate(arrayView) {
    arrayView = arrayView.slice(0, this.maxLength);
    this._blockedIPs = arrayView.map(
      (value) => new BlockedIP(value[0], value[1], value[2], value[3])
    );
  }

  /**
   * Create a read-only 1D array whose elements are blocked hashed IP addresses.
   * @returns {[string]}
   */
  createHashedIPArray() {
    // @ts-ignore
    return this._blockedIPs.map((blockedIP) => blockedIP.hashedIP);
  }
}

export const blockedIPList = new BlockedIPList(50);
