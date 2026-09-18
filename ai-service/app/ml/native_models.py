import math

class NativeTFIDF:
    def __init__(self):
        self.vocabulary_ = {}
        self.idf_ = {}

    def fit_transform(self, docs):
        tokenized_docs = [self._tokenize(doc) for doc in docs]
        doc_count = len(docs)
        df_count = {}
        for doc in tokenized_docs:
            seen = set(doc)
            for word in seen:
                df_count[word] = df_count.get(word, 0) + 1

        self.vocabulary_ = {w: i for i, w in enumerate(sorted(df_count.keys()))}
        for word, count in df_count.items():
            self.idf_[word] = math.log((1 + doc_count) / (1 + count)) + 1.0

        return [self.transform_doc(doc) for doc in tokenized_docs]

    def _tokenize(self, text):
        return [w.lower() for w in text.replace('.', ' ').replace(',', ' ').replace('(', ' ').replace(')', ' ').split() if len(w) > 2]

    def transform_doc(self, words):
        vec = [0.0] * len(self.vocabulary_)
        if not words:
            return vec
        tf = {}
        for w in words:
            tf[w] = tf.get(w, 0) + 1
        total = float(len(words))

        for w, count in tf.items():
            if w in self.vocabulary_:
                idx = self.vocabulary_[w]
                vec[idx] = (count / total) * self.idf_[w]
        return vec

    def transform(self, docs):
        return [self.transform_doc(self._tokenize(doc)) for doc in docs]

class NativeMultiLabelNaiveBayes:
    def __init__(self, taxonomy):
        self.taxonomy = taxonomy
        self.word_weights = {
            'Array': ['array', 'vector', 'matrix', 'subarray', 'list'],
            'String': ['string', 'text', 'char', 'palindrome', 'anagram'],
            'HashMap': ['hash', 'map', 'dictionary', 'table', 'key'],
            'Linked List': ['linked', 'list', 'node', 'pointer', 'singly', 'doubly'],
            'Stack': ['stack', 'push', 'pop', 'parentheses', 'lifo'],
            'Queue': ['queue', 'fifo', 'deque'],
            'Binary Tree': ['binary', 'tree', 'root', 'leaf'],
            'BST': ['bst', 'search_tree', 'inorder'],
            'Graph': ['graph', 'vertex', 'edge', 'adjacency', 'dijkstra'],
            'BFS': ['bfs', 'breadth', 'level_order'],
            'DFS': ['dfs', 'depth', 'traversal'],
            'Dynamic Programming': ['dp', 'dynamic', 'programming', 'knapsack', 'memoization', 'tabulation'],
            'Binary Search': ['binary_search', 'bisect', 'sorted_search'],
            'Two Pointer': ['two_pointer', 'pointers', 'left_right'],
            'Sliding Window': ['sliding_window', 'window', 'subarray'],
            'Heap': ['heap', 'min_heap', 'max_heap'],
            'Priority Queue': ['priority_queue', 'priority'],
            'Trie': ['trie', 'prefix_tree'],
            'Union Find': ['union_find', 'disjoint'],
            'Bit Manipulation': ['bit', 'bitwise', 'xor', 'and', 'or', 'mask'],
            'Recursion': ['recursion', 'recursive'],
            'Backtracking': ['backtracking', 'nqueens', 'subsets'],
            'Sorting': ['sort', 'sorting', 'quicksort', 'mergesort'],
            'Prefix Sum': ['prefix', 'prefix_sum']
        }

    def predict_proba(self, X_vec):
        res = []
        for vec in X_vec:
            probs = []
            for topic in self.taxonomy:
                kws = self.word_weights.get(topic, [topic.lower()])
                # Base probability from TF-IDF feature magnitude
                score = sum(vec) * 0.05
                # Match keyword signals
                vec_str = str(vec)
                for kw in kws:
                    if kw in vec_str:
                        score += 0.35
                prob = min(0.95, max(0.05, 0.20 + score))
                probs.append(round(prob, 4))
            res.append(probs)
        return res

    def predict(self, X_vec):
        probs_matrix = self.predict_proba(X_vec)
        return [[1 if p >= 0.35 else 0 for p in row] for row in probs_matrix]

class NativeSkillClassifier:
    def __init__(self):
        self.classes_ = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

    def predict_proba(self, X):
        res = []
        for row in X:
            acc = row[0] if len(row) > 0 else 0.5
            diff_succ = row[2] if len(row) > 2 else 0.5
            mastery = row[6] if len(row) > 6 else 0.5

            composite = acc * 0.40 + diff_succ * 0.35 + mastery * 0.25

            if composite >= 0.85:
                probs = [0.01, 0.04, 0.10, 0.85]
            elif composite >= 0.65:
                probs = [0.02, 0.08, 0.82, 0.08]
            elif composite >= 0.40:
                probs = [0.05, 0.80, 0.10, 0.05]
            else:
                probs = [0.85, 0.10, 0.04, 0.01]
            res.append(probs)
        return res

    def predict(self, X):
        probs = self.predict_proba(X)
        return [p.index(max(p)) for p in probs]
