package tools.refinery.store.map;

import java.util.*;

import tools.refinery.store.map.internal.DeltaDiffCursor;
import tools.refinery.store.map.internal.MapDelta;
import tools.refinery.store.map.internal.MapTransaction;
import tools.refinery.store.map.internal.VersionedMapDeltaImpl;

public class VersionedMapStoreDeltaImpl<K, V> implements VersionedMapStore<K, V>{
	// Static data
	protected final V defaultValue;

	// Dynamic data
	protected final Map<Long,MapTransaction<K, V>> states = new HashMap<>();
	protected long nextID = 0;

	public VersionedMapStoreDeltaImpl(V defaultValue) {
		super();
		this.defaultValue = defaultValue;
	}

	@Override
	public VersionedMap<K, V> createMap() {
		return new VersionedMapDeltaImpl<>(this, defaultValue);
	}

	@Override
	public VersionedMap<K, V> createMap(long state) {
		VersionedMapDeltaImpl<K, V> result = new VersionedMapDeltaImpl<>(this, defaultValue);
		result.restore(state);
		return result;
	}

	public synchronized MapTransaction<K, V> appendTransaction(MapDelta<K, V>[] deltas, MapTransaction<K, V> previous, long[] versionContainer) {
		long version = nextID++;
		versionContainer[0] = version;
		if(deltas == null) {
			states.put(version, previous);
			return previous;
		} else {
			MapTransaction<K, V> transaction = new MapTransaction<>(deltas, version, previous);
			states.put(version, transaction);
			return transaction;
		}
	}

	private synchronized MapTransaction<K,V> getState(long state) {
		return states.get(state);
	}

	public void getPath(long to, List<MapDelta<K, V>[]> forwardTransactions) {
		MapTransaction<K,V> toTransaction = getState(to);
		while(toTransaction != null) {
			forwardTransactions.add(toTransaction.deltas());
			toTransaction = toTransaction.parent();
		}
	}

	public void getPath(long from, long to,
			List<MapDelta<K, V>[]> backwardTransactions,
			List<MapDelta<K, V>[]> forwardTransactions)
	{
		MapTransaction<K,V> fromTransaction = getState(from);
		MapTransaction<K,V> toTransaction = getState(to);
		while(fromTransaction != toTransaction) {
			if(fromTransaction == null || fromTransaction.version() < toTransaction.version()) {
				forwardTransactions.add(toTransaction.deltas());
				toTransaction = toTransaction.parent();
			} else {
				backwardTransactions.add(fromTransaction.deltas());
				fromTransaction = fromTransaction.parent();
			}
		}
	}


	@Override
	public synchronized Set<Long> getStates() {
		return states.keySet();
	}

	@Override
	public DiffCursor<K, V> getDiffCursor(long fromState, long toState) {
		List<MapDelta<K, V>[]> backwardTransactions = new ArrayList<>();
		List<MapDelta<K, V>[]> forwardTransactions = new ArrayList<>();
		getPath(fromState, toState, backwardTransactions, forwardTransactions);
		return new DeltaDiffCursor<>(backwardTransactions, forwardTransactions);
	}
}
